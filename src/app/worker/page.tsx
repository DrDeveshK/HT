import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { daysBetween } from "@/lib/fees";
import Link from "next/link";
import { setAvailability } from "@/actions/worker";
import { submitRating } from "@/actions/deputations";
import { overallFromDims } from "@/core/reputation";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Stat, SeasonPill, StateBadge, Badge, EmptyState, Stars, Select } from "@/components/ui";
import { formatINR, formatDate, HOTEL_RATING_DIMENSIONS } from "@/lib/constants";

export default async function WorkerHome() {
  const user = await requireRole("WORKER");
  const worker = user.worker!;
  const { stateOf } = await loadSeasonContext();
  const homeState = stateOf(worker.homeHotel.regionId);

  const deps = await prisma.deputation.findMany({
    where: { workerId: worker.id },
    include: { demandHotel: { include: { region: true } }, role: true, ratings: true },
    orderBy: { updatedAt: "desc" },
  });

  const skills = (() => {
    try {
      return JSON.parse(worker.skillsJson) as string[];
    } catch {
      return [];
    }
  })();

  const earnings = deps
    .filter((d) => ["AGREED", "IN_TRANSIT", "ACTIVE", "COMPLETED", "RETURNED"].includes(d.state))
    .reduce((s, d) => s + d.wagePerDayPaise * daysBetween(d.startDate, d.endDate), 0);

  return (
    <>
      <PageHeader
        title={worker.name}
        subtitle={`${worker.primaryRole.name} · home: ${worker.homeHotel.name}`}
        action={<SeasonPill state={homeState} />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reputation" value={`★ ${worker.reputationScore.toFixed(1)}`} sub={`${worker.ratingCount} ratings`} />
        <Stat label="Experience" value={`${worker.experienceYears}y`} />
        <Stat label="Deputation earnings" value={formatINR(earnings)} sub="agreed + completed" />
        <Stat label="Status" value={worker.availabilityStatus.replace("_", " ")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader title="Profile" />
          <div className="space-y-3 p-5 text-sm">
            <p className="text-slate-600">
              Home region <span className="font-medium text-slate-900">{worker.homeHotel.region.name}</span> is currently{" "}
              <span className="font-medium">{homeState.toLowerCase()}</span>-season.
              {homeState === "OFF" && " Great time to earn on a deputation elsewhere."}
            </p>
            <div>
              <p className="text-xs text-slate-400">Skills</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {skills.length ? skills.map((s) => <Badge key={s} tone="slate">{s}</Badge>) : <span className="text-slate-400">—</span>}
              </div>
            </div>
            <p className="text-slate-600">Expected wage: <span className="font-medium text-slate-900">{formatINR(worker.expectedWagePaise)}/day</span></p>
            <p className="text-slate-600">KYC: {worker.kycStatus === "VERIFIED" ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">{worker.kycStatus}</Badge>}</p>

            {worker.availabilityStatus !== "ON_DEPUTATION" && (
              <form action={setAvailability} className="pt-2">
                <input type="hidden" name="to" value={worker.availabilityStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE"} />
                <SubmitButton variant="secondary" size="sm" pendingText="Updating…">
                  {worker.availabilityStatus === "AVAILABLE" ? "Set unavailable" : "Set available"}
                </SubmitButton>
              </form>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Your deputations" subtitle="Offers and assignments across the season" />
          <div className="p-5">
            {deps.length === 0 ? (
              <EmptyState title="No deputations yet" hint="When a hotel requests you, it will appear here." />
            ) : (
              <div className="space-y-3">
                {deps.map((d) => {
                  const agg = (() => {
                    try {
                      return JSON.parse(d.demandHotel.ratingAggJson) as Record<string, number>;
                    } catch {
                      return {};
                    }
                  })();
                  const isOffer = d.state === "REQUESTED";
                  const canRateHost =
                    (d.state === "COMPLETED" || d.state === "RETURNED") &&
                    !d.ratings.some((r) => r.raterRole === "WORKER" && r.targetHotelId === d.demandHotelId);
                  return (
                    <div
                      key={d.id}
                      className={`rounded-lg border p-4 ${isOffer ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {d.role.name} at{" "}
                            <Link href={`/hotels/${d.demandHotelId}`} className="hover:text-brand-600 hover:underline">
                              {d.demandHotel.name}
                            </Link>
                          </p>
                          <p className="text-xs text-slate-500">
                            {d.demandHotel.city} · {formatDate(d.startDate)} – {formatDate(d.endDate)} · {formatINR(d.wagePerDayPaise)}/day
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            Employer rating:{" "}
                            {d.demandHotel.ratingCount > 0 ? (
                              <>
                                <Stars value={overallFromDims(agg)} />
                                <span className="text-slate-400">({d.demandHotel.ratingCount})</span>
                              </>
                            ) : (
                              <span className="text-slate-400">no reviews yet</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isOffer && <Badge tone="amber">New offer</Badge>}
                          <StateBadge state={d.state} />
                        </div>
                      </div>
                      {isOffer && (
                        <p className="mt-2 text-xs text-slate-500">Check the hotel’s track record before you decide.</p>
                      )}
                      {canRateHost && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-brand-600">Rate this hotel</summary>
                          <form action={submitRating} className="mt-3 space-y-3">
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="targetType" value="HOTEL" />
                            <input type="hidden" name="targetHotelId" value={d.demandHotelId} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              {HOTEL_RATING_DIMENSIONS.map((dim) => (
                                <label key={dim.key} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                                  {dim.label}
                                  <Select name={`dim_${dim.key}`} defaultValue="4" className="w-16">
                                    {[5, 4, 3, 2, 1].map((n) => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </Select>
                                </label>
                              ))}
                            </div>
                            <input
                              name="comment"
                              placeholder="Optional comment"
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                            <SubmitButton size="sm" variant="secondary" pendingText="Saving…">Submit rating</SubmitButton>
                          </form>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
