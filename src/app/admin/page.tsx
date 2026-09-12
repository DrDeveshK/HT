import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext, openDeclarationCountsByRegion } from "@/lib/seasonal-data";
import { NationalSeasonMap } from "@/components/NationalSeasonMap";
import { PageHeader, Card, CardHeader, Stat, StateBadge } from "@/components/ui";
import { formatINR } from "@/lib/constants";

export default async function AdminOverview() {
  await requireRole("PLATFORM_ADMIN");
  const { views } = await loadSeasonContext();
  const counts = await openDeclarationCountsByRegion();

  const [hotels, workers, activeDeps, revenueAgg, enabledModules, recent] = await Promise.all([
    prisma.hotel.count(),
    prisma.worker.count(),
    prisma.deputation.count({
      where: { state: { in: ["REQUESTED", "ACCEPTED", "AGREED", "IN_TRANSIT", "ACTIVE"] } },
    }),
    prisma.ledgerEntry.aggregate({ _sum: { amountPaise: true }, where: { direction: "REVENUE" } }),
    prisma.revenueModule.count({ where: { enabled: true } }),
    prisma.deputation.findMany({
      include: { worker: true, homeHotel: true, demandHotel: true, role: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);
  const revenue = revenueAgg._sum.amountPaise ?? 0;

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Network health and monetization at a glance." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Hotels" value={hotels} />
        <Stat label="Workers" value={workers} />
        <Stat label="Active deputations" value={activeDeps} />
        <Stat label="Platform revenue" value={formatINR(revenue)} sub="all-time (sandbox)" />
        <Stat label="Revenue modules on" value={enabledModules} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent deputations" />
          <div className="space-y-2 p-5">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400">None yet.</p>
            ) : (
              recent.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">
                    {d.worker.name} · {d.role.name} · {d.homeHotel.name} → {d.demandHotel.name}
                  </span>
                  <StateBadge state={d.state} />
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Season snapshot" />
          <div className="p-5">
            <NationalSeasonMap views={views} counts={counts} />
          </div>
        </Card>
      </div>
    </>
  );
}
