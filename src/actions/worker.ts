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

export async function addWorkerSkill(formData: FormData) {
  const user = await requireRole("WORKER");
  if (!user.workerId) return;
  const skillId = String(formData.get("skillId"));
  const proficiency = Math.max(1, Math.min(5, Number(formData.get("proficiency") || 3)));
  if (!skillId) return;
  await prisma.workerSkill.upsert({
    where: { workerId_skillId: { workerId: user.workerId, skillId } },
    create: { workerId: user.workerId, skillId, proficiency },
    update: { proficiency },
  });
  revalidatePath("/worker/profile");
}

export async function removeWorkerSkill(formData: FormData) {
  const user = await requireRole("WORKER");
  if (!user.workerId) return;
  const id = String(formData.get("id"));
  const ws = await prisma.workerSkill.findUnique({ where: { id } });
  if (ws && ws.workerId === user.workerId) await prisma.workerSkill.delete({ where: { id } });
  revalidatePath("/worker/profile");
}

export async function updateWorkerProfile(formData: FormData) {
  const user = await requireRole("WORKER");
  if (!user.workerId) return;
  const zones = formData.getAll("zones").map(String);
  const maxDistanceKm = Math.max(0, Number(formData.get("maxDistanceKm") || 0));
  await prisma.worker.update({
    where: { id: user.workerId },
    data: {
      experienceYears: Math.max(0, Number(formData.get("experienceYears") || 0)),
      expectedWagePaise: Math.round(Number(formData.get("expectedWageRupees") || 0) * 100),
      emergencyContact: String(formData.get("emergencyContact") || "") || null,
      relocationPrefsJson: JSON.stringify({ zones, maxDistanceKm }),
    },
  });
  revalidatePath("/worker/profile");
  revalidatePath("/worker");
}
