import { prisma } from "@/lib/db";

/** Fan out a notification to several users (nulls/dupes filtered). */
export async function notify(userIds: (string | null | undefined)[], title: string, body: string): Promise<void> {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  await prisma.notification.createMany({ data: ids.map((recipientUserId) => ({ recipientUserId, title, body })) });
}

/** User ids of everyone party to a deputation (both hotels + the worker), minus one. */
export async function deputationRecipients(
  dep: { homeHotelId: string; demandHotelId: string; workerId: string },
  exceptUserId?: string,
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { OR: [{ hotelId: dep.homeHotelId }, { hotelId: dep.demandHotelId }, { workerId: dep.workerId }] },
    select: { id: true },
  });
  return users.map((u) => u.id).filter((id) => id !== exceptUserId);
}

/** Append an audit-log entry for a sensitive action. */
export async function audit(
  actorUserId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string,
  meta?: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: actorUserId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      metaJson: meta ? JSON.stringify(meta) : null,
    },
  });
}
