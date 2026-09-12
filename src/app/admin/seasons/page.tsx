import { requireRole } from "@/lib/auth";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { PageHeader, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { MONTHS, SEASON_STATE_STYLE, type SeasonState } from "@/lib/constants";

export default async function AdminSeasons() {
  await requireRole("PLATFORM_ADMIN");
  const { regions, packs, month } = await loadSeasonContext();

  const map: Record<string, Record<number, SeasonState>> = {};
  for (const p of packs) {
    (map[p.regionId] ??= {})[p.month] = p.state;
  }

  return (
    <>
      <PageHeader
        title="Seasonal calendar"
        subtitle="Every region, month by month. This dataset drives matching and corridor suggestions."
      />
      <Card className="overflow-x-auto p-5">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-slate-500">Region</th>
              {MONTHS.map((m, i) => (
                <th key={m} className={cn("p-2 font-medium", i + 1 === month ? "text-brand-700" : "text-slate-500")}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap p-2 text-slate-700">{r.name.split("(")[0].trim()}</td>
                {MONTHS.map((_, i) => {
                  const st = map[r.id]?.[i + 1] ?? "SHOULDER";
                  const s = SEASON_STATE_STYLE[st];
                  return (
                    <td key={i} className="p-1">
                      <div
                        className="h-6 rounded"
                        style={{ backgroundColor: s.hex, opacity: i + 1 === month ? 1 : 0.7 }}
                        title={`${r.name} · ${MONTHS[i]}: ${s.label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
          {(["PEAK", "SHOULDER", "OFF"] as SeasonState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: SEASON_STATE_STYLE[s].hex }} />
              {SEASON_STATE_STYLE[s].label}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}
