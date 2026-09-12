"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function setAvailability(formData: FormData) {
  const user = await requireRole("WORKER");
  if (!user.workerId) return;
  const to = String(formData.get("to"));
  const worker = await prisma.worker.findUnique({ where: { id: user.workerId } });
  if (!worker || worker.availabilityStatus === "ON_DEPUTATION") return;
  if (to === "AVAILABLE" || to === "UNAVAILABLE") {
    await prisma.worker.update({ where: { id: user.workerId }, data: { availabilityStatus: to } });
  }
  revalidatePath("/worker");
}
