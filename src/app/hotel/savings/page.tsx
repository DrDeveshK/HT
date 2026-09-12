import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/fees";
import { loadSavingsAssumptions } from "@/lib/analytics-data";
import { computeSavings, type SavingsDeputation } from "@/core/analytics";
import { PageHeader, Card, CardHeader, Stat, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/constants";

const VALUE_STATES = ["AGREED", "IN_TRANSIT", "ACTIVE", "COMPLETED", "RETURNED"];

export default async function HotelSavings() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const deps = await prisma.deputation.findMany({
    where: { OR: [{ homeHotelId: hotel.id }, { demandHotelId: hotel.id }], state: { in: VALUE_STATES } },
  });
  const assumptions = await loadSavingsAssumptions();
  const sav: SavingsDeputation[] = deps.map((d) => ({
    wagePerDayPaise: d.wagePerDayPaise,
    days: daysBetween(d.startDate, d.endDate),
    side: d.homeHotelId === hotel.id ? "HOME" : "DEMAND",
  }));
  const r = computeSavings(sav, assumptions);

  return (
    <>
      <PageHeader title="Cost savings" subtitle="What HT has saved this property versus hiring seasonally on your own." />
      {deps.length === 0 ? (
        <EmptyState title="No deputations yet" hint="Savings appear once you lend or borrow staff." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total saved" value={formatINR(r.totalPaise)} sub={`${r.lent} lent · ${r.borrowed} borrowed`} />
            <Stat label="Idle payroll recovered" value={formatINR(r.idleRecoveredPaise)} sub="off-season staff earning" />
            <Stat label="Avoided rehiring" value={formatINR(r.avoidedRehirePaise)} sub={`${r.borrowed} × ${formatINR(assumptions.rehireCostPaise)}`} />
            <Stat label="Avoided retraining" value={formatINR(r.avoidedRetrainPaise)} sub={`${r.borrowed} × ${formatINR(assumptions.retrainCostPaise)}`} />
          </div>
          <Card>
            <CardHeader title="How this is calculated" />
            <div className="space-y-2 p-5 text-sm text-slate-600">
              <p>• Lending staff during your off-season recovers <b>{assumptions.idlePayrollRecoveryPct}%</b> of their wage bill that would otherwise be idle cost.</p>
              <p>• Borrowing trained staff avoids <b>{formatINR(assumptions.rehireCostPaise)}</b> rehiring + <b>{formatINR(assumptions.retrainCostPaise)}</b> retraining per head.</p>
              <p className="text-xs text-slate-400">Assumptions are set by the platform admin and can be tuned in Settings.</p>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
