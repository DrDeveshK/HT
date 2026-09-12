import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";

const NAV: NavItem[] = [
  { href: "/worker", label: "My work", exact: true },
  { href: "/worker/planner", label: "Planner" },
  { href: "/worker/profile", label: "Profile" },
];

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("WORKER");
  return (
    <AppShell
      section="Worker"
      navItems={NAV}
      userName={user.worker?.name ?? user.name}
      userMeta={user.worker?.homeHotel?.name}
      bell={<NotificationBell userId={user.id} />}
    >
      {children}
    </AppShell>
  );
}
