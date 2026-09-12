import { prisma } from "@/lib/db";
import { markNotificationsRead } from "@/actions/messages";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate } from "@/lib/constants";

export async function NotificationBell({ userId }: { userId: string }) {
  const items = await prisma.notification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center rounded-md px-2 py-1.5 text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
        <span className="relative text-lg leading-none">
          🔔
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-800">Notifications</span>
          {unread > 0 && (
            <form action={markNotificationsRead}>
              <SubmitButton size="sm" variant="ghost" pendingText="…">Mark all read</SubmitButton>
            </form>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`border-b border-slate-50 px-4 py-2.5 ${n.readAt ? "" : "bg-brand-50/50"}`}>
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
