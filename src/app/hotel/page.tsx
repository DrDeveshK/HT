import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext, openDeclarationCountsByRegion } from "@/lib/seasonal-data";
import { NationalSeasonMap } from "@/components/NationalSeasonMap";
import { PageHeader, Card, CardHeader, Stat, LinkButton, SeasonPill, Badge } from "@/components/ui";

export default async function HotelDashboard() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const { views, corridors, stateOf } = await loadSeasonContext();
  const counts = await openDeclarationCountsByRegion();
  const myState = stateOf(hotel.regionId);

  const [openDecls, activeDeps] = await Promise.all([
    prisma.seasonDeclaration.count({ where: { hotelId: hotel.id, status: "OPEN" } }),
    prisma.deputation.count({
      where: {
        OR: [{ homeHotelId: hotel.id }, { demandHotelId: hotel.id }],
        state: { in: ["REQUESTED", "ACCEPTED", "AGREED", "IN_TRANSIT", "ACTIVE"] },
      },
    }),
  ]);

  const relevant =
    myState === "OFF"
      ? corridors.filter((c) => c.from.id === hotel.regionId)
      : myState === "PEAK"
        ? corridors.filter((c) => c.to.id === hotel.regionId)
        : [];

  const banner =
    myState === "OFF"
      ? {
          tone: "bg-sky-50 border-sky-200 text-sky-900",
          title: "Your region is off-season — turn idle payroll into income.",
          body: "Lend your surplus staff to peak-season hotels. Post a SURPLUS declaration, or browse hotels that need staff right now.",
          cta: { href: "/hotel/declarations", label: "Post surplus staff" },
        }
      : myState === "PEAK"
        ? {
            tone: "bg-red-50 border-red-200 text-red-900",
            title: "Your region is peaking — source trained staff fast.",
            body: "Find pre-trained, housing-ready staff from off-season regions and send a deputation request.",
            cta: { href: "/hotel/marketplace", label: "Find staff now" },
          }
        : {
            tone: "bg-slate-50 border-slate-200 text-slate-700",
            title: "Shoulder season.",
            body: "Plan ahead — watch the national map for corridors opening up.",
            cta: { href: "/hotel/marketplace", label: "Browse marketplace" },
          };

  return (
    <>
      <PageHeader
        title={`Welcome, ${hotel.name}`}
        subtitle={`${hotel.city} · ${hotel.region.name}`}
        action={<SeasonPill state={myState} />}
      />

      <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5 ${banner.tone}`}>
        <div className="max-w-2xl">
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-1 text-sm opacity-90">{banner.body}</p>
        </div>
        <LinkButton href={banner.cta.href}>{banner.cta.label}</LinkButton>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Your season" value={myState} />
        <Stat label="Open declarations" value={openDecls} />
        <Stat label="Active deputations" value={activeDeps} />
        <Stat label="Plan" value={hotel.subscription?.plan ?? "FREE"} />
      </div>

      {relevant.length > 0 && (
        <Card className="mb-8">
          <CardHeader
            title={myState === "OFF" ? "Where to send your staff" : "Where to source staff"}
            subtitle="Live counter-seasonal corridors involving your region"
          />
          <div className="flex flex-wrap gap-2 p-5">
            {relevant.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{c.from.name.split("(")[0].trim()}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-700">{c.to.name.split("(")[0].trim()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="National season map"
          subtitle="Where India is peaking vs troughing right now"
          action={<Badge tone="blue">{views.length} regions</Badge>}
        />
        <div className="p-5">
          <NationalSeasonMap views={views} counts={counts} />
        </div>
      </Card>
    </>
  );
}
