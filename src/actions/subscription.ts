"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function changePlan(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  const key = String(formData.get("plan"));
  const plan = await prisma.plan.findUnique({ where: { key } });
  if (!plan) throw new Error("Invalid plan.");

  await prisma.subscription.upsert({
    where: { hotelId: user.hotelId! },
    create: { hotelId: user.hotelId!, plan: key, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    update: { plan: key, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  });

  // Sandbox "payment" → record platform revenue for the subscription module.
  if (plan.pricePaise > 0) {
    await prisma.ledgerEntry.create({
      data: {
        type: "SUBSCRIPTION",
        moduleKey: "subscription",
        amountPaise: plan.pricePaise,
        direction: "REVENUE",
        payeeType: "PLATFORM",
        description: `Subscription: ${plan.name} — ${user.hotel?.name ?? ""}`.trim(),
      },
    });
  }

  revalidatePath("/hotel/subscription");
  revalidatePath("/hotel");
}
