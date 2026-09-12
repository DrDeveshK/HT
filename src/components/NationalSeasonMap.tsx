import { SeasonPill } from "@/components/ui";
import type { RegionSeasonView } from "@/core/seasonal";

export function NationalSeasonMap({
  views,
  counts,
}: {
  views: RegionSeasonView[];
  counts?: Record<string, { surplus: number; demand: number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {views.map((v) => {
        const c = counts?.[v.region.id];
        return (
          <div key={v.region.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium leading-tight text-slate-800">{v.region.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {v.region.zone} · {v.region.dominantType.toLowerCase()}
                </p>
              </div>
              <SeasonPill state={v.state} />
            </div>
            {c && (c.surplus || c.demand) ? (
              <div className="mt-3 flex gap-4 text-xs font-medium">
                <span className="text-sky-600">{c.surplus} surplus</span>
                <span className="text-red-600">{c.demand} needed</span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-300">No open posts</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
