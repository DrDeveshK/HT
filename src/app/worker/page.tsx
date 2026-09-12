import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { daysBetween } from "@/lib/fees";
import { setAvailability } from "@/actions/worker";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Stat, SeasonPill, StateBadge, Badge, EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

export default async function WorkerHome() {
  const user = await requireRole("WORKER");
  const worker = user.worker!;
  const { stateOf } = await loadSeasonContext();
  const homeState = stateOf(worker.homeHotel.regionId);

  const deps = await prisma.deputation.findMany({
    where: { workerId: worker.id },
    include: { demandHotel: { include: { region: true } }, role: true },
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
                {deps.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="font-medium text-slate-800">
                        {d.role.name} at {d.demandHotel.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.demandHotel.city} · {formatDate(d.startDate)} – {formatDate(d.endDate)} · {formatINR(d.wagePerDayPaise)}/day
                      </p>
                    </div>
                    <StateBadge state={d.state} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
