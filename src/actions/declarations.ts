"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["SURPLUS", "DEMAND"]),
  roleId: z.string().min(1),
  headcount: z.coerce.number().int().min(1).max(500),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  wageRupees: z.coerce.number().min(0),
});

export async function createDeclaration(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
  const d = parsed.data;

  await prisma.seasonDeclaration.create({
    data: {
      hotelId: user.hotelId!,
      type: d.type,
      roleId: d.roleId,
      headcount: d.headcount,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      wageOfferPaise: Math.round(d.wageRupees * 100),
      housingProvided: formData.get("housingProvided") === "on",
    },
  });

  revalidatePath("/hotel/declarations");
  revalidatePath("/hotel");
  redirect("/hotel/declarations");
}

export async function closeDeclaration(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  const id = String(formData.get("id"));
  const decl = await prisma.seasonDeclaration.findUnique({ where: { id } });
  if (decl && decl.hotelId === user.hotelId) {
    await prisma.seasonDeclaration.update({ where: { id }, data: { status: "CLOSED" } });
  }
  revalidatePath("/hotel/declarations");
  revalidatePath("/hotel");
}
