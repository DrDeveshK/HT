"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify, deputationRecipients } from "@/lib/notify";

function isParty(user: { hotelId: string | null; workerId: string | null; role: string }, dep: { homeHotelId: string; demandHotelId: string; workerId: string }): boolean {
  return (
    user.hotelId === dep.homeHotelId ||
    user.hotelId === dep.demandHotelId ||
    user.role === "PLATFORM_ADMIN" ||
    (user.role === "WORKER" && user.workerId === dep.workerId)
  );
}

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const threadKey = String(formData.get("threadKey"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const dep = await prisma.deputation.findUnique({ where: { id: threadKey } });
  if (!dep) throw new Error("Thread not found.");
  if (!isParty(user, dep)) throw new Error("Not authorized for this thread.");

  await prisma.message.create({ data: { threadKey, fromUserId: user.id, body } });
  await notify(await deputationRecipients(dep, user.id), "New message", `${user.name}: ${body.slice(0, 80)}`);

  revalidatePath(`/hotel/deputations/${threadKey}`);
  revalidatePath("/worker");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { recipientUserId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
