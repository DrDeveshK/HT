import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/revenue", label: "Revenue modules" },
  { href: "/admin/hotels", label: "Hotels" },
  { href: "/admin/seasons", label: "Seasons" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PLATFORM_ADMIN");
  return (
    <AppShell section="Platform admin" navItems={NAV} userName={user.name} userMeta="Platform admin">
      {children}
    </AppShell>
  );
}
