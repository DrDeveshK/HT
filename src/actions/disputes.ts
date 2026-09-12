"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { notify, deputationRecipients, audit } from "@/lib/notify";

export async function raiseDispute(formData: FormData) {
  const user = await requireUser();
  const deputationId = String(formData.get("deputationId"));
  const category = String(formData.get("category") || "OTHER");
  const description = String(formData.get("description") || "").trim();
  if (!description) return;

  const dep = await prisma.deputation.findUnique({ where: { id: deputationId } });
  if (!dep) throw new Error("Deputation not found.");
  const party =
    user.hotelId === dep.homeHotelId ||
    user.hotelId === dep.demandHotelId ||
    (user.role === "WORKER" && user.workerId === dep.workerId);
  if (!party) throw new Error("Not authorized.");

  await prisma.dispute.create({ data: { deputationId, raisedByUserId: user.id, category, description, status: "OPEN" } });
  await audit(user.id, "DISPUTE_RAISED", "Deputation", deputationId, { category });

  const admins = await prisma.user.findMany({ where: { role: "PLATFORM_ADMIN" }, select: { id: true } });
  await notify(admins.map((a) => a.id), "New dispute raised", `${category} · ${description.slice(0, 80)}`);

  revalidatePath(`/hotel/deputations/${deputationId}`);
  revalidatePath("/admin/disputes");
}

export async function resolveDispute(formData: FormData) {
  const user = await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const resolutionNote = String(formData.get("resolutionNote") || "") || null;
  if (!["RESOLVED", "REJECTED"].includes(status)) return;

  const dispute = await prisma.dispute.update({ where: { id }, data: { status, resolutionNote } });
  await audit(user.id, `DISPUTE_${status}`, "Dispute", id);

  const dep = await prisma.deputation.findUnique({ where: { id: dispute.deputationId } });
  if (dep) await notify(await deputationRecipients(dep), `Dispute ${status.toLowerCase()}`, resolutionNote ?? "The platform reviewed your dispute.");

  revalidatePath("/admin/disputes");
}
