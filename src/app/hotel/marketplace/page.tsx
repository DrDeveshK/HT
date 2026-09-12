import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { rankMatches, type MatchWorker } from "@/core/matching";
import Link from "next/link";
import { requestDeputation } from "@/actions/deputations";
import { toggleFavourite } from "@/actions/hotel";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, SeasonPill, ScorePill, Badge, Input, EmptyState, RehirePill } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

function parseZones(json: string): string[] {
  try {
    return (JSON.parse(json)?.zones ?? []) as string[];
  } catch {
    return [];
  }
}

function parseDims(json: string): Record<string, number> {
  try {
    return (JSON.parse(json) ?? {}) as Record<string, number>;
  } catch {
    return {};
  }
}

export default async function Marketplace() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const { stateOf } = await loadSeasonContext();

  const favourites = await prisma.favourite.findMany({
    where: { hotelId: hotel.id },
    include: { worker: { include: { primaryRole: true, homeHotel: true } } },
    orderBy: { createdAt: "desc" },
  });
  const favSet = new Set(favourites.map((f) => f.workerId));

  const surplus = await prisma.seasonDeclaration.findMany({
    where: { type: "SURPLUS", status: "OPEN", hotelId: { not: hotel.id } },
    include: { hotel: { include: { region: true } }, role: true },
    orderBy: { createdAt: "desc" },
  });

  const cards = await Promise.all(
    surplus.map(async (decl) => {
      const workers = await prisma.worker.findMany({
        where: { homeHotelId: decl.hotelId, primaryRoleId: decl.roleId, availabilityStatus: "AVAILABLE" },
        include: { skills: { include: { skill: true } } },
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
        willingZones: parseZones(w.relocationPrefsJson),
        rehireRate: w.rehireRate,
        reliability: parseDims(w.dimensionAggJson).reliability,
        previouslyRehiredByDemand: favSet.has(w.id),
      }));
      const ranked = rankMatches(matchWorkers, {
        roleId: decl.roleId,
        demandRegionId: hotel.regionId,
        wageOfferPaise: decl.wageOfferPaise,
        housingProvided: decl.housingProvided,
        demandZone: hotel.region.zone,
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

      {favourites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Your rehire shortlist</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {favourites.map((f) => (
              <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-800">
                    <Link href={`/workers/${f.workerId}`} className="hover:text-brand-600 hover:underline">{f.worker.name}</Link>
                  </p>
                  <p className="text-xs text-slate-500">
                    {f.worker.primaryRole.name} · {f.worker.homeHotel.name} ·{" "}
                    {f.worker.availabilityStatus === "AVAILABLE" ? "available" : f.worker.availabilityStatus.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {f.worker.rehireRate > 0 && <RehirePill rate={f.worker.rehireRate} />}
                  {f.worker.availabilityStatus === "AVAILABLE" ? (
                    <form action={requestDeputation}>
                      <input type="hidden" name="workerId" value={f.workerId} />
                      <SubmitButton size="sm" pendingText="Requesting…">Request again</SubmitButton>
                    </form>
                  ) : (
                    <Badge tone="slate">On deputation</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

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
                      <div key={m.worker.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-[11rem] flex-1">
                          <p className="font-medium text-slate-800">
                            <Link href={`/workers/${w.id}`} className="hover:text-brand-600 hover:underline">{w.name}</Link>
                          </p>
                          <p className="text-xs text-slate-500">
                            {w.experienceYears}y exp · ★ {w.reputationScore.toFixed(1)} · expects{" "}
                            {formatINR(w.expectedWagePaise)}/day · {w.kycStatus === "VERIFIED" ? "KYC ✓" : "KYC pending"}
                          </p>
                          {w.skills.length > 0 && (
                            <p className="mt-1 flex flex-wrap gap-1">
                              {w.skills.map((ws) => (
                                <span key={ws.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{ws.skill.name}</span>
                              ))}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">{m.reasons.join(" · ")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <ScorePill score={m.score} />
                          {w.rehireRate > 0 && <RehirePill rate={w.rehireRate} />}
                        </div>
                        <form action={toggleFavourite} title={favSet.has(w.id) ? "Remove from shortlist" : "Add to rehire shortlist"}>
                          <input type="hidden" name="workerId" value={w.id} />
                          <SubmitButton size="sm" variant="ghost" pendingText="…">
                            {favSet.has(w.id) ? "♥" : "♡"}
                          </SubmitButton>
                        </form>
                        <form action={requestDeputation} className="flex items-center gap-2">
                          <input type="hidden" name="workerId" value={w.id} />
                          <input type="hidden" name="declarationId" value={decl.id} />
                          <span className="text-xs text-slate-400">₹/day</span>
                          <Input name="wageRupees" type="number" min={0} defaultValue={defaultWage} className="w-24" />
                          <SubmitButton size="sm" pendingText="Requesting…">Request</SubmitButton>
                        </form>
                      </div>
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
