import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { rankMatches, type MatchWorker } from "@/core/matching";
import { requestDeputation } from "@/actions/deputations";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, SeasonPill, ScorePill, Badge, Input, EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

export default async function Marketplace() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const { stateOf } = await loadSeasonContext();

  const surplus = await prisma.seasonDeclaration.findMany({
    where: { type: "SURPLUS", status: "OPEN", hotelId: { not: hotel.id } },
    include: { hotel: { include: { region: true } }, role: true },
    orderBy: { createdAt: "desc" },
  });

  const cards = await Promise.all(
    surplus.map(async (decl) => {
      const workers = await prisma.worker.findMany({
        where: { homeHotelId: decl.hotelId, primaryRoleId: decl.roleId, availabilityStatus: "AVAILABLE" },
      });
      const homeState = stateOf(decl.hotel.regionId);
      const matchWorkers: MatchWorker[] = workers.map((w) => ({
        id: w.id,
        name: w.name,
        primaryRoleId: w.primaryRoleId,
        homeRegionId: decl.hotel.regionId,
        homeRegionState: homeState,
        expectedWagePaise: w.expectedWagePaise,
        reputationScore: w.reputationScore,
        experienceYears: w.experienceYears,
        availabilityStatus: w.availabilityStatus,
        kycStatus: w.kycStatus,
      }));
      const ranked = rankMatches(matchWorkers, {
        roleId: decl.roleId,
        demandRegionId: hotel.regionId,
        wageOfferPaise: decl.wageOfferPaise,
        housingProvided: decl.housingProvided,
      });
      const byId = Object.fromEntries(workers.map((w) => [w.id, w]));
      return { decl, homeState, ranked, byId };
    }),
  );

  const demand = await prisma.seasonDeclaration.findMany({
    where: { type: "DEMAND", status: "OPEN", hotelId: { not: hotel.id } },
    include: { hotel: { include: { region: true } }, role: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Marketplace"
        subtitle="Source trained staff from off-season regions — or see who needs your surplus."
        action={<SeasonPill state={stateOf(hotel.regionId)} />}
      />

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Staff available to borrow</h2>
      {cards.length === 0 ? (
        <EmptyState title="No surplus staff posted yet" hint="Check back as off-season regions list their teams." />
      ) : (
        cards.map(({ decl, homeState, ranked, byId }, idx) => (
          <details key={decl.id} open={idx === 0} className="group mb-4 rounded-xl border border-slate-200 bg-white shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
                <div>
                  <p className="font-semibold text-slate-900">{decl.role.name} · {decl.hotel.name}</p>
                  <p className="text-sm text-slate-500">{decl.hotel.city} · {decl.hotel.region.state}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SeasonPill state={homeState} />
                <Badge tone="slate">{decl.headcount} available</Badge>
                {ranked[0] && <ScorePill score={ranked[0].score} />}
              </div>
            </summary>
            <div className="border-t border-slate-100 p-5">
              {decl.note && <p className="mb-2 text-sm text-slate-500">{decl.note}</p>}
              <p className="mb-3 text-xs text-slate-400">
                Window {formatDate(decl.startDate)} – {formatDate(decl.endDate)} · Expected{" "}
                {formatINR(decl.wageOfferPaise)}/day · Housing {decl.housingProvided ? "provided" : "not provided"}
              </p>
              {ranked.length === 0 ? (
                <EmptyState title="No available workers right now" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {ranked.map((m) => {
                    const w = byId[m.worker.id];
                    const defaultWage = Math.max(decl.wageOfferPaise, w.expectedWagePaise) / 100;
                    return (
                      <form key={m.worker.id} action={requestDeputation} className="flex flex-wrap items-center gap-3 py-3">
                        <input type="hidden" name="workerId" value={m.worker.id} />
                        <input type="hidden" name="declarationId" value={decl.id} />
                        <div className="min-w-[11rem] flex-1">
                          <p className="font-medium text-slate-800">{w.name}</p>
                          <p className="text-xs text-slate-500">
                            {w.experienceYears}y exp · ★ {w.reputationScore.toFixed(1)} · expects{" "}
                            {formatINR(w.expectedWagePaise)}/day · {w.kycStatus === "VERIFIED" ? "KYC ✓" : "KYC pending"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{m.reasons.join(" · ")}</p>
                        </div>
                        <ScorePill score={m.score} />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">₹/day</span>
                          <Input name="wageRupees" type="number" min={0} defaultValue={defaultWage} className="w-24" />
                          <SubmitButton size="sm" pendingText="Requesting…">Request</SubmitButton>
                        </div>
                      </form>
                    );
                  })}
                </div>
              )}
            </div>
          </details>
        ))
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">Hotels seeking staff</h2>
      {demand.length === 0 ? (
        <EmptyState title="No open demand right now" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {demand.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{d.role.name} × {d.headcount}</p>
                  <p className="text-xs text-slate-500">{d.hotel.name} · {d.hotel.city}</p>
                </div>
                <SeasonPill state={stateOf(d.hotel.regionId)} />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {formatDate(d.startDate)} – {formatDate(d.endDate)} · offers {formatINR(d.wageOfferPaise)}/day
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
