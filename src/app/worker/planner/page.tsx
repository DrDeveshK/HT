import { requireRole } from "@/lib/auth";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { projectAnnualIncome, upcomingPeak } from "@/core/analytics";
import { PageHeader, Card, CardHeader, Stat, SeasonPill, EmptyState } from "@/components/ui";
import { formatINR, MONTHS, SEASON_STATE_STYLE, type SeasonState } from "@/lib/constants";

export default async function WorkerPlanner() {
  const user = await requireRole("WORKER");
  const worker = user.worker!;
  const { packs, views, stateOf, month } = await loadSeasonContext();

  const homeRegionId = worker.homeHotel.regionId;
  const homeStates: SeasonState[] = Array.from({ length: 12 }, (_, i) => {
    const p = packs.find((x) => x.regionId === homeRegionId && x.month === i + 1);
    return (p?.state ?? "SHOULDER") as SeasonState;
  });
  const income = projectAnnualIncome({ wagePerDayPaise: worker.expectedWagePaise || 80000, homeStates });
  const homeState = stateOf(homeRegionId);
  const nextPeak = upcomingPeak(packs, homeRegionId, month);
  const peakNow = views.filter((v) => v.state === "PEAK" && v.region.id !== homeRegionId).slice(0, 8);

  return (
    <>
      <PageHeader
        title="Follow-the-season planner"
        subtitle="Turn a 6-month seasonal job into year-round income."
        action={<SeasonPill state={homeState} />}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Single-season income" value={formatINR(income.singlePaise)} sub={`${income.activeMonths} active months at home`} />
        <Stat label="Follow-the-season income" value={formatINR(income.followPaise)} sub="year-round via corridors" />
        <Stat label="Potential uplift" value={formatINR(income.upliftPaise)} sub={`${income.offMonths} off-months put to work`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Your home region: ${worker.homeHotel.region.name}`} subtitle="Season by month" />
          <div className="flex flex-wrap gap-1.5 p-5">
            {homeStates.map((s, i) => {
              const st = SEASON_STATE_STYLE[s];
              return (
                <div key={i} className={`flex w-14 flex-col items-center rounded-md px-1 py-1.5 ${st.bg}`}>
                  <span className="text-[10px] text-slate-500">{MONTHS[i]}</span>
                  <span className={`text-[10px] font-medium ${st.text}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
          {nextPeak && (
            <p className="px-5 pb-4 text-sm text-slate-600">
              Your home region peaks again in <b>{MONTHS[nextPeak.month - 1]}</b> ({nextPeak.monthsAhead} month
              {nextPeak.monthsAhead > 1 ? "s" : ""} away).
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Where the work is now"
            subtitle={homeState === "OFF" ? "Your region is off — time to travel" : "Peak regions hiring across India"}
          />
          <div className="p-5">
            {peakNow.length === 0 ? (
              <EmptyState title="No peak regions right now" />
            ) : (
              <ul className="space-y-2">
                {peakNow.map((v) => (
                  <li key={v.region.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-800">{v.region.name}</p>
                      <p className="text-xs text-slate-500">{v.region.state} · {v.region.dominantType.toLowerCase()}</p>
                    </div>
                    <SeasonPill state={v.state} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
