import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [{ href: "/worker", label: "My work", exact: true }];

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("WORKER");
  return (
    <AppShell
      section="Worker"
      navItems={NAV}
      userName={user.worker?.name ?? user.name}
      userMeta={user.worker?.homeHotel?.name}
    >
      {children}
    </AppShell>
  );
}
