import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transitionDeputation, submitRating } from "@/actions/deputations";
import { computeDeputationCharges, daysBetween } from "@/lib/fees";
import { actionsFor, type Actor } from "@/core/deputation/stateMachine";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, StateBadge, Stat, Table, Th, Td, Field, Select } from "@/components/ui";
import { formatINR, formatDate, type DeputationState } from "@/lib/constants";

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

          {canRate && (
            <Card>
              <CardHeader title="Ratings" subtitle="Build the portable reputation that makes the network sticky." />
              <div className="space-y-4 p-5">
                {actor === "DEMAND_HOTEL" && <RatingForm id={dep.id} targetType="WORKER" label={`Rate ${dep.worker.name}`} />}
                <RatingForm
                  id={dep.id}
                  targetType="HOTEL"
                  label={`Rate ${actor === "DEMAND_HOTEL" ? dep.homeHotel.name : dep.demandHotel.name}`}
                />
                {dep.ratings.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">Ratings so far</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {dep.ratings.map((r) => (
                        <li key={r.id}>
                          ★ {r.score} — {r.raterLabel} on {r.targetWorker?.name ?? r.targetHotel?.name}
                          {r.comment ? `: “${r.comment}”` : ""}
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

function RatingForm({ id, targetType, label }: { id: string; targetType: "WORKER" | "HOTEL"; label: string }) {
  return (
    <form action={submitRating} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="targetType" value={targetType} />
      <Field label={label}>
        <Select name="score" defaultValue="5" className="w-28">
          <option value="5">★★★★★</option>
          <option value="4">★★★★</option>
          <option value="3">★★★</option>
          <option value="2">★★</option>
          <option value="1">★</option>
        </Select>
      </Field>
      <input
        name="comment"
        placeholder="Optional comment"
        className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <SubmitButton size="sm" variant="secondary" pendingText="Saving…">
        Submit
      </SubmitButton>
    </form>
  );
}
