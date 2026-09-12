"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PLAN_PRICING, type SubscriptionPlan } from "@/lib/constants";

export async function changePlan(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  const plan = String(formData.get("plan")) as SubscriptionPlan;
  const price = PLAN_PRICING[plan];
  if (!price) throw new Error("Invalid plan.");

  await prisma.subscription.upsert({
    where: { hotelId: user.hotelId! },
    create: {
      hotelId: user.hotelId!,
      plan,
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
    update: { plan, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  });

  // Sandbox "payment" → record platform revenue for the subscription module.
  if (price.pricePaise > 0) {
    await prisma.ledgerEntry.create({
      data: {
        type: "SUBSCRIPTION",
        moduleKey: "subscription",
        amountPaise: price.pricePaise,
        direction: "REVENUE",
        payeeType: "PLATFORM",
        description: `Subscription: ${price.label} — ${user.hotel?.name ?? ""}`.trim(),
      },
    });
  }

  revalidatePath("/hotel/subscription");
  revalidatePath("/hotel");
}
