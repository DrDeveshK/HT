import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";
import { SeasonPill } from "@/components/ui";
import { loadSeasonContext } from "@/lib/seasonal-data";

const NAV: NavItem[] = [
  { href: "/hotel", label: "Dashboard", exact: true },
  { href: "/hotel/marketplace", label: "Marketplace" },
  { href: "/hotel/declarations", label: "My declarations" },
  { href: "/hotel/deputations", label: "Deputations" },
  { href: "/hotel/subscription", label: "Subscription" },
];

export default async function HotelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const { stateOf } = await loadSeasonContext();

  return (
    <AppShell
      section="Hotelier"
      navItems={NAV}
      userName={hotel.name}
      userMeta={hotel.city}
      headerRight={<SeasonPill state={stateOf(hotel.regionId)} />}
    >
      {children}
    </AppShell>
  );
}
