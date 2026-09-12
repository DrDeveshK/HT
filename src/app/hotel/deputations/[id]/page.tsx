import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transitionDeputation, submitRating, makeCounterOffer, acceptOffer, rejectOffer, withdrawOffer } from "@/actions/deputations";
import { computeDeputationCharges, daysBetween } from "@/lib/fees";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { actionsFor, type Actor } from "@/core/deputation/stateMachine";
import { suggestFairWage } from "@/core/pricing";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, StateBadge, Stat, Table, Th, Td, Select, Stars, Badge, Input } from "@/components/ui";
import { formatINR, formatDate, WORKER_RATING_DIMENSIONS, HOTEL_RATING_DIMENSIONS, type RatingDimension, type DeputationState } from "@/lib/constants";

export default async function DeputationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const dep = await prisma.deputation.findUnique({
    where: { id },
    include: {
      worker: { include: { primaryRole: true } },
      role: true,
      homeHotel: { include: { region: true } },
      demandHotel: { include: { region: true } },
      agreement: true,
      ledgerEntries: true,
      ratings: { include: { targetWorker: true, targetHotel: true } },
      offers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!dep) notFound();

  const isParty =
    user.hotelId === dep.homeHotelId ||
    user.hotelId === dep.demandHotelId ||
    user.role === "PLATFORM_ADMIN" ||
    (user.role === "WORKER" && user.workerId === dep.workerId);
  if (!isParty) notFound();

  const actor: Actor =
    user.role === "PLATFORM_ADMIN"
      ? "PLATFORM"
      : user.hotelId === dep.homeHotelId
        ? "HOME_HOTEL"
        : user.hotelId === dep.demandHotelId
          ? "DEMAND_HOTEL"
          : "WORKER";

  const state = dep.state as DeputationState;
  const actions = actionsFor(state, actor);
  const days = daysBetween(dep.startDate, dep.endDate);
  const charges = await computeDeputationCharges({
    wagePerDayPaise: dep.wagePerDayPaise,
    days,
    housingProvided: dep.housingProvided,
  });
  const locked = dep.ledgerEntries.length > 0;
  const canRate = state === "COMPLETED" || state === "RETURNED";

  // Negotiation (M4): per-offer fee previews + fair-wage guidance.
  const offers = dep.offers;
  const previews = await Promise.all(
    offers.map((o) =>
      computeDeputationCharges({
        wagePerDayPaise: o.wagePerDayPaise,
        days: daysBetween(o.startDate, o.endDate),
        housingProvided: o.housingProvided,
      }),
    ),
  );
  const openOffer = [...offers].reverse().find((o) => o.status === "PROPOSED") ?? null;
  const negotiable = (state === "NEGOTIATING" || state === "REQUESTED") && (actor === "HOME_HOTEL" || actor === "DEMAND_HOTEL");
  const { stateOf } = await loadSeasonContext();
  const fair = suggestFairWage({
    baseWagePaise: dep.worker.expectedWagePaise || dep.wagePerDayPaise,
    demandSeason: stateOf(dep.demandHotel.regionId),
  });

  return (
    <>
      <PageHeader
        title={`${dep.worker.name} · ${dep.role.name}`}
        subtitle={`${dep.homeHotel.name} → ${dep.demandHotel.name}`}
        action={<StateBadge state={dep.state} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Deputation details" />
            <div className="grid grid-cols-2 gap-4 p-5 text-sm">
              <Detail label="Worker" value={`${dep.worker.name} · ${dep.worker.primaryRole.name}`} />
              <Detail label="Reputation" value={`★ ${dep.worker.reputationScore.toFixed(1)}`} />
              <Detail label="Home hotel" value={`${dep.homeHotel.name}, ${dep.homeHotel.city}`} />
              <Detail label="Host hotel" value={`${dep.demandHotel.name}, ${dep.demandHotel.city}`} />
              <Detail label="Window" value={`${formatDate(dep.startDate)} – ${formatDate(dep.endDate)} (${days}d)`} />
              <Detail label="Wage/day" value={formatINR(dep.wagePerDayPaise)} />
              <Detail label="Housing" value={dep.housingProvided ? "Provided" : "Not provided"} />
              <Detail label="Agreement" value={dep.agreement?.eSignStatus === "SIGNED" ? "Signed (e-sign)" : "Not signed"} />
            </div>
            <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-3 text-sm">
              <Link href={`/workers/${dep.workerId}`} className="text-brand-600 hover:underline">Worker profile →</Link>
              <Link href={`/hotels/${dep.homeHotelId}`} className="text-brand-600 hover:underline">Home hotel →</Link>
              <Link href={`/hotels/${dep.demandHotelId}`} className="text-brand-600 hover:underline">Host hotel →</Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Actions" subtitle={`You are acting as the ${actorLabel(actor)}`} />
            <div className="flex flex-wrap gap-3 p-5">
              {actions.length === 0 ? (
                <p className="text-sm text-slate-400">No actions available in “{dep.state}”.</p>
              ) : (
                actions.map((a) => (
                  <form key={a.to} action={transitionDeputation}>
                    <input type="hidden" name="id" value={dep.id} />
                    <input type="hidden" name="to" value={a.to} />
                    <SubmitButton variant={a.to === "CANCELLED" ? "danger" : "primary"} pendingText="Working…">
                      {a.label}
                    </SubmitButton>
                  </form>
                ))
              )}
            </div>
          </Card>

          {offers.length > 0 && (
            <Card>
              <CardHeader
                title="Negotiation"
                subtitle={state === "NEGOTIATING" ? "Offer & counter-offer on wage and terms" : "Agreed terms"}
              />
              <div className="space-y-4 p-5">
                {negotiable && (
                  <p className="rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700">
                    Suggested fair wage <span className="font-semibold">{formatINR(fair.suggestedPaise)}/day</span>{" "}
                    (band {formatINR(fair.lowPaise)}–{formatINR(fair.highPaise)}) · {fair.reasons.join(" · ")}
                  </p>
                )}
                <ol className="space-y-2">
                  {offers.map((o, i) => (
                    <li key={o.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-slate-800">{offerPartyLabel(o.byParty)}</span>
                        <span className="text-slate-500">{formatINR(o.wagePerDayPaise)}/day</span>
                        <OfferStatusBadge status={o.status} />
                        <span className="ml-auto text-xs text-slate-400">{formatDate(o.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(o.startDate)} – {formatDate(o.endDate)} · housing {o.housingProvided ? "provided" : "no"} · borrower pays{" "}
                        {formatINR(previews[i].totals.borrowerPaysPaise)} · worker gets {formatINR(previews[i].totals.workerGetsPaise)}
                      </p>
                      {o.note && <p className="mt-1 text-xs text-slate-400">“{o.note}”</p>}
                      {negotiable && openOffer?.id === o.id && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {o.byParty === actor ? (
                            <form action={withdrawOffer}>
                              <input type="hidden" name="id" value={dep.id} />
                              <input type="hidden" name="offerId" value={o.id} />
                              <SubmitButton size="sm" variant="ghost" pendingText="…">Withdraw</SubmitButton>
                            </form>
                          ) : (
                            <>
                              <form action={acceptOffer}>
                                <input type="hidden" name="id" value={dep.id} />
                                <input type="hidden" name="offerId" value={o.id} />
                                <SubmitButton size="sm" pendingText="…">Accept these terms</SubmitButton>
                              </form>
                              <form action={rejectOffer}>
                                <input type="hidden" name="id" value={dep.id} />
                                <input type="hidden" name="offerId" value={o.id} />
                                <SubmitButton size="sm" variant="secondary" pendingText="…">Reject</SubmitButton>
                              </form>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                {negotiable && (
                  <form action={makeCounterOffer} className="space-y-3 rounded-lg border border-dashed border-slate-300 p-3">
                    <p className="text-sm font-medium text-slate-700">Make a counter-offer</p>
                    <input type="hidden" name="id" value={dep.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        ₹/day
                        <Input name="wageRupees" type="number" min={0} defaultValue={Math.round((openOffer?.wagePerDayPaise ?? dep.wagePerDayPaise) / 100)} />
                      </label>
                      <label className="flex items-end gap-2 text-sm text-slate-600">
                        <input type="checkbox" name="housingProvided" defaultChecked={dep.housingProvided} /> Housing provided
                      </label>
                      <label className="text-sm text-slate-600">
                        Start
                        <Input name="startDate" type="date" defaultValue={dep.startDate.toISOString().slice(0, 10)} />
                      </label>
                      <label className="text-sm text-slate-600">
                        End
                        <Input name="endDate" type="date" defaultValue={dep.endDate.toISOString().slice(0, 10)} />
                      </label>
                    </div>
                    <Input name="note" placeholder="Optional note" />
                    <SubmitButton size="sm" variant="secondary" pendingText="Sending…">Send counter-offer</SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          )}

          {canRate && (
            <Card>
              <CardHeader title="Ratings" subtitle="Build the portable reputation that makes the network sticky." />
              <div className="space-y-5 p-5">
                {actor === "DEMAND_HOTEL" && (
                  <DimensionRatingForm id={dep.id} targetType="WORKER" title={`Rate ${dep.worker.name}`} dims={WORKER_RATING_DIMENSIONS} rehire />
                )}
                {(actor === "DEMAND_HOTEL" || actor === "HOME_HOTEL") && (
                  <DimensionRatingForm
                    id={dep.id}
                    targetType="HOTEL"
                    title={`Rate ${actor === "DEMAND_HOTEL" ? dep.homeHotel.name : dep.demandHotel.name}`}
                    dims={HOTEL_RATING_DIMENSIONS}
                  />
                )}
                {dep.ratings.filter((r) => r.status === "VISIBLE").length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">Ratings so far</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {dep.ratings
                        .filter((r) => r.status === "VISIBLE")
                        .map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-2">
                            <Stars value={r.score} />
                            <span className="text-slate-500">
                              {r.raterLabel} → {r.targetWorker?.name ?? r.targetHotel?.name}
                            </span>
                            {r.wouldRehire && <span className="text-green-600">· would rehire</span>}
                            {r.comment ? <span className="text-slate-400">“{r.comment}”</span> : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Money split"
            subtitle={locked ? "Locked at agreement" : "Live estimate — reflects enabled revenue modules"}
          />
          <div className="grid grid-cols-2 gap-3 p-5">
            <Stat label="Borrower pays" value={formatINR(charges.totals.borrowerPaysPaise)} />
            <Stat label="Worker gets" value={formatINR(charges.totals.workerGetsPaise)} />
            {charges.totals.homeHotelGetsPaise > 0 && (
              <Stat label="Home hotel gets" value={formatINR(charges.totals.homeHotelGetsPaise)} />
            )}
            <Stat label="Platform revenue" value={formatINR(charges.totals.platformRevenuePaise)} />
          </div>
          <div className="px-5 pb-5">
            <Table>
              <thead>
                <tr>
                  <Th>Line</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {charges.lines.map((l, i) => (
                  <tr key={i}>
                    <Td>
                      <span className="text-slate-700">{l.label}</span>
                      <span className="block text-xs text-slate-400">
                        {l.fromParty} → {l.toParty}
                      </span>
                    </Td>
                    <Td className="text-right">{formatINR(l.amountPaise)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function actorLabel(a: Actor): string {
  return a === "HOME_HOTEL" ? "home hotel" : a === "DEMAND_HOTEL" ? "host hotel" : a === "WORKER" ? "worker" : "platform";
}

function offerPartyLabel(p: string): string {
  return p === "HOME_HOTEL" ? "Home hotel" : p === "DEMAND_HOTEL" ? "Host hotel" : "Worker";
}

function OfferStatusBadge({ status }: { status: string }) {
  const tone = status === "ACCEPTED" ? "green" : status === "PROPOSED" ? "amber" : status === "REJECTED" || status === "WITHDRAWN" ? "red" : "slate";
  return <Badge tone={tone as "green" | "amber" | "red" | "slate"}>{status.toLowerCase()}</Badge>;
}

function DimensionRatingForm({
  id,
  targetType,
  title,
  dims,
  rehire = false,
  targetHotelId,
}: {
  id: string;
  targetType: "WORKER" | "HOTEL";
  title: string;
  dims: readonly RatingDimension[];
  rehire?: boolean;
  targetHotelId?: string;
}) {
  return (
    <form action={submitRating} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="targetType" value={targetType} />
      {targetHotelId && <input type="hidden" name="targetHotelId" value={targetHotelId} />}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {dims.map((d) => (
          <label key={d.key} className="flex items-center justify-between gap-2 text-sm text-slate-600">
            {d.label}
            <Select name={`dim_${d.key}`} defaultValue="4" className="w-16">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </label>
        ))}
      </div>
      {rehire && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="wouldRehire" defaultChecked /> Would rehire this worker
        </label>
      )}
      <input
        name="comment"
        placeholder="Optional comment"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <SubmitButton size="sm" variant="secondary" pendingText="Saving…">
        Submit rating
      </SubmitButton>
    </form>
  );
}
