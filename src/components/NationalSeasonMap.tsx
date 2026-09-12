import { cn } from "@/lib/cn";
import { SEASON_STATE_STYLE } from "@/lib/constants";
import type { RegionSeasonView } from "@/core/seasonal";

const ZONE_ORDER = ["NORTH", "WEST", "CENTRAL", "EAST", "NORTHEAST", "SOUTH", "ISLANDS"];
const ZONE_LABEL: Record<string, string> = {
  NORTH: "North",
  WEST: "West",
  CENTRAL: "Central",
  EAST: "East",
  NORTHEAST: "North-East",
  SOUTH: "South",
  ISLANDS: "Islands",
};

export function NationalSeasonMap({
  views,
  counts,
}: {
  views: RegionSeasonView[];
  counts?: Record<string, { surplus: number; demand: number }>;
}) {
  const zones = [...new Set(views.map((v) => v.region.zone))].sort(
    (a, b) => ZONE_ORDER.indexOf(a) - ZONE_ORDER.indexOf(b),
  );

  return (
    <div className="space-y-5">
      {zones.map((zone) => {
        const zoneViews = views.filter((v) => v.region.zone === zone);
        const states = [...new Set(zoneViews.map((v) => v.region.state))];
        return (
          <div key={zone}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {ZONE_LABEL[zone] ?? zone}
            </h4>
            <div className="space-y-2.5">
              {states.map((state) => (
                <div key={state} className="grid grid-cols-[9rem_1fr] gap-2">
                  <p className="pt-0.5 text-sm font-medium text-slate-600">{state}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {zoneViews
                      .filter((v) => v.region.state === state)
                      .map((v) => {
                        const s = SEASON_STATE_STYLE[v.state];
                        const c = counts?.[v.region.id];
                        const label = v.region.name.startsWith("Rest of ") ? "Rest of state" : v.region.name;
                        return (
                          <span
                            key={v.region.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs",
                              s.bg,
                              s.text,
                            )}
                            title={`${v.region.name}: ${s.label}`}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                            {label}
                            {c && (c.surplus || c.demand) ? (
                              <span className="ml-0.5 font-semibold">
                                {c.surplus ? `+${c.surplus}` : ""}
                                {c.demand ? ` −${c.demand}` : ""}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
