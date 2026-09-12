import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/deputations", label: "Deputations" },
  { href: "/admin/workers", label: "Workers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/hotels", label: "Hotels" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PLATFORM_ADMIN");
  return (
    <AppShell section="Platform admin" navItems={NAV} userName={user.name} userMeta="Platform admin" bell={<NotificationBell userId={user.id} />}>
      {children}
    </AppShell>
  );
}
