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

/** Proportional stacked bar of PEAK/SHOULDER/OFF counts. */
export function SeasonMixBar({ peak, shoulder, off }: { peak: number; shoulder: number; off: number }) {
  const total = Math.max(1, peak + shoulder + off);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <span className="inline-flex h-2 w-28 overflow-hidden rounded-full bg-slate-100">
      {peak > 0 && <span className="bg-red-500" style={{ width: pct(peak) }} />}
      {shoulder > 0 && <span className="bg-amber-400" style={{ width: pct(shoulder) }} />}
      {off > 0 && <span className="bg-sky-500" style={{ width: pct(off) }} />}
    </span>
  );
}

export function NationalSeasonMap({
  views,
  counts,
  openZone,
}: {
  views: RegionSeasonView[];
  counts?: Record<string, { surplus: number; demand: number }>;
  openZone?: string;
}) {
  const zones = [...new Set(views.map((v) => v.region.zone))].sort(
    (a, b) => ZONE_ORDER.indexOf(a) - ZONE_ORDER.indexOf(b),
  );

  return (
    <div className="space-y-3">
      {zones.map((zone) => {
        const zoneViews = views.filter((v) => v.region.zone === zone);
        const peak = zoneViews.filter((v) => v.state === "PEAK").length;
        const shoulder = zoneViews.filter((v) => v.state === "SHOULDER").length;
        const off = zoneViews.filter((v) => v.state === "OFF").length;
        const states = [...new Set(zoneViews.map((v) => v.region.state))];
        return (
          <details key={zone} open={zone === openZone} className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="text-slate-400 transition-transform group-open:rotate-90">▸</span>
                <span className="font-semibold text-slate-800">{ZONE_LABEL[zone] ?? zone}</span>
                <span className="text-xs text-slate-400">{zoneViews.length} destinations</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="hidden gap-2 text-xs font-medium sm:flex">
                  <span className="text-red-600">{peak} peak</span>
                  <span className="text-amber-600">{shoulder} shoulder</span>
                  <span className="text-sky-600">{off} off</span>
                </span>
                <SeasonMixBar peak={peak} shoulder={shoulder} off={off} />
              </span>
            </summary>
            <div className="space-y-3 border-t border-slate-100 p-4">
              {states.map((state) => (
                <div key={state} className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr]">
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
          </details>
        );
      })}
    </div>
  );
}
