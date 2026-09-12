import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { PageHeader, Card, CardHeader, Stat, StateBadge, LinkButton } from "@/components/ui";
import { SeasonMixBar } from "@/components/NationalSeasonMap";
import { formatINR, PLAN_PRICING, type SubscriptionPlan } from "@/lib/constants";

export default async function AdminOverview() {
  await requireRole("PLATFORM_ADMIN");
  const { views } = await loadSeasonContext();
  const peak = views.filter((v) => v.state === "PEAK").length;
  const shoulder = views.filter((v) => v.state === "SHOULDER").length;
  const off = views.filter((v) => v.state === "OFF").length;

  const [hotels, workers, activeDeps, revenueAgg, enabledModules, subs, recent] = await Promise.all([
    prisma.hotel.count(),
    prisma.worker.count(),
    prisma.deputation.count({
      where: { state: { in: ["REQUESTED", "ACCEPTED", "AGREED", "IN_TRANSIT", "ACTIVE"] } },
    }),
    prisma.ledgerEntry.aggregate({ _sum: { amountPaise: true }, where: { direction: "REVENUE" } }),
    prisma.revenueModule.count({ where: { enabled: true } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: true } }),
    prisma.deputation.findMany({
      include: { worker: true, homeHotel: true, demandHotel: true, role: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);
  const revenue = revenueAgg._sum.amountPaise ?? 0;
  const mrr = subs.reduce((s, x) => s + (PLAN_PRICING[x.plan as SubscriptionPlan]?.pricePaise ?? 0), 0);

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Network health and monetization at a glance." />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Hotels" value={hotels} />
        <Stat label="Workers" value={workers} />
        <Stat label="Active deputations" value={activeDeps} />
        <Stat label="MRR (subscriptions)" value={formatINR(mrr)} />
        <Stat label="Platform revenue" value={formatINR(revenue)} sub="all-time (sandbox)" />
        <Stat label="Modules on" value={enabledModules} />
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
          <CardHeader
            title="Season snapshot"
            subtitle={`${views.length} hotspots across India`}
            action={<LinkButton href="/admin/seasons" variant="secondary" size="sm">Full calendar</LinkButton>}
          />
          <div className="flex items-center gap-3 px-5 pt-5">
            <SeasonMixBar peak={peak} shoulder={shoulder} off={off} />
            <span className="text-xs text-slate-400">live mix</span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            <Stat label="Peak now" value={peak} />
            <Stat label="Shoulder" value={shoulder} />
            <Stat label="Off-season" value={off} />
          </div>
        </Card>
      </div>
    </>
  );
}
