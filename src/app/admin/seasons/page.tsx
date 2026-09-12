import { requireRole } from "@/lib/auth";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { addHotspot } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ARCHETYPES, ZONES } from "@/lib/archetypes";
import { MONTHS, SEASON_STATE_STYLE, type SeasonState } from "@/lib/constants";

const ZONE_LABEL: Record<string, string> = {
  NORTH: "North",
  WEST: "West",
  CENTRAL: "Central",
  EAST: "East",
  NORTHEAST: "North-East",
  SOUTH: "South",
  ISLANDS: "Islands",
};

export default async function AdminSeasons() {
  await requireRole("PLATFORM_ADMIN");
  const { regions, packs, month } = await loadSeasonContext();

  const map: Record<string, Record<number, SeasonState>> = {};
  for (const p of packs) (map[p.regionId] ??= {})[p.month] = p.state;

  const zones = [...new Set(regions.map((r) => r.zone))]; // query already ordered by zone,state,name

  return (
    <>
      <PageHeader
        title="Seasonal calendar"
        subtitle="Click a state to expand its destinations. This dataset drives matching and corridors."
      />

      <div className="mb-4 flex gap-4 text-xs text-slate-500">
        {(["PEAK", "SHOULDER", "OFF"] as SeasonState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: SEASON_STATE_STYLE[s].hex }} />
            {SEASON_STATE_STYLE[s].label}
          </span>
        ))}
      </div>

      <Card className="mb-6 p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Add a destination</h3>
        <form action={addHotspot} className="flex flex-wrap items-end gap-3">
          <Field label="Name"><Input name="name" placeholder="e.g. Coonoor" required /></Field>
          <Field label="State / UT"><Input name="state" placeholder="e.g. Tamil Nadu" required /></Field>
          <Field label="Zone">
            <Select name="zone" defaultValue="SOUTH">{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</Select>
          </Field>
          <Field label="Season profile">
            <Select name="arch" defaultValue="HILL">
              {Object.entries(ARCHETYPES).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
            </Select>
          </Field>
          <SubmitButton pendingText="Adding…">Add destination</SubmitButton>
        </form>
      </Card>

      <div className="space-y-6">
        {zones.map((zone) => {
          const zoneRegions = regions.filter((r) => r.zone === zone);
          const states = [...new Set(zoneRegions.map((r) => r.state))];
          return (
            <div key={zone}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {ZONE_LABEL[zone] ?? zone}
              </h3>
              <div className="space-y-2">
                {states.map((state) => {
                  const stateRegions = zoneRegions.filter((r) => r.state === state);
                  const cur = stateRegions.map((r) => map[r.id]?.[month] ?? "SHOULDER");
                  const nP = cur.filter((s) => s === "PEAK").length;
                  const nS = cur.filter((s) => s === "SHOULDER").length;
                  const nO = cur.filter((s) => s === "OFF").length;
                  return (
                    <details key={state} className="rounded-lg border border-slate-200 bg-white">
                      <summary className="cursor-pointer px-4 py-3 text-sm marker:text-slate-400">
                        <span className="font-medium text-slate-800">{state}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {stateRegions.length} destinations · now:{" "}
                          {nP > 0 && <span className="text-red-600">{nP} peak </span>}
                          {nS > 0 && <span className="text-amber-600">{nS} shoulder </span>}
                          {nO > 0 && <span className="text-sky-600">{nO} off</span>}
                        </span>
                      </summary>
                      <div className="overflow-x-auto border-t border-slate-100 p-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="p-1 text-left font-medium text-slate-500">Destination</th>
                              {MONTHS.map((m, i) => (
                                <th key={m} className={cn("p-1", i + 1 === month ? "font-semibold text-brand-700" : "text-slate-400")}>
                                  {m}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stateRegions.map((r) => (
                              <tr key={r.id}>
                                <td className="whitespace-nowrap p-1 text-slate-700">
                                  {r.name.startsWith("Rest of ") ? "Rest of state" : r.name}
                                </td>
                                {MONTHS.map((_, i) => {
                                  const st = map[r.id]?.[i + 1] ?? "SHOULDER";
                                  const s = SEASON_STATE_STYLE[st];
                                  return (
                                    <td key={i} className="p-0.5">
                                      <div
                                        className="h-5 rounded"
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
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
