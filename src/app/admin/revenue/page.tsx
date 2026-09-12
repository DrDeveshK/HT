import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setModule } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Badge, Table, Th, Td } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

const CONFIG_LABEL: Record<string, string> = {
  percent: "Commission (%)",
  flatPaise: "Flat fee (paise)",
  homeHotelSharePercent: "Home-hotel lending fee (%)",
  marginPercent: "Margin (%)",
  perDayPaise: "Per-day premium (paise)",
};

function safeParse(s: string): Record<string, number> {
  try {
    return JSON.parse(s) as Record<string, number>;
  } catch {
    return {};
  }
}

export default async function AdminRevenue() {
  await requireRole("PLATFORM_ADMIN");
  const [modules, ledger] = await Promise.all([
    prisma.revenueModule.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { direction: "REVENUE" }, orderBy: { createdAt: "desc" } }),
  ]);

  const nameByKey = Object.fromEntries(modules.map((m) => [m.key, m.name]));
  const total = ledger.reduce((s, e) => s + e.amountPaise, 0);
  const byModule = new Map<string, number>();
  for (const e of ledger) byModule.set(e.moduleKey ?? "other", (byModule.get(e.moduleKey ?? "other") ?? 0) + e.amountPaise);
  const byModuleArr = [...byModule.entries()].sort((a, b) => b[1] - a[1]);
  const recent = ledger.slice(0, 8);

  return (
    <>
      <PageHeader title="Revenue" subtitle="Earnings to date and the modular streams that produce them." />

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Revenue to date" subtitle="Platform earnings (sandbox)" />
          <div className="p-5">
            <p className="text-3xl font-bold text-slate-900">{formatINR(total)}</p>
            <div className="mt-4 space-y-1.5">
              {byModuleArr.length === 0 ? (
                <p className="text-sm text-slate-400">No revenue recorded yet.</p>
              ) : (
                byModuleArr.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{nameByKey[k] ?? k}</span>
                    <span className="font-medium text-slate-800">{formatINR(v)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent transactions" />
          <div className="p-2">
            {recent.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">None yet.</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Detail</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDate(e.createdAt)}</Td>
                      <Td className="text-xs">{e.description}</Td>
                      <Td className="text-right">{formatINR(e.amountPaise)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <h2 className="mb-1 text-lg font-semibold text-slate-900">Revenue modules</h2>
      <p className="mb-4 text-sm text-slate-500">
        Toggle any stream on/off and set its rates — changes take effect immediately in deputation pricing.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => {
          const cfg = safeParse(m.configJson);
          const keys = Object.keys(cfg);
          return (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{m.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{m.description}</p>
                </div>
                <Badge tone={m.enabled ? "green" : "slate"}>{m.enabled ? "On" : "Off"}</Badge>
              </div>
              <form action={setModule} className="mt-4 space-y-3">
                <input type="hidden" name="key" value={m.key} />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="enabled" defaultChecked={m.enabled} /> Enabled
                </label>
                {keys.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {keys.map((k) => (
                      <label key={k} className="block text-xs text-slate-500">
                        {CONFIG_LABEL[k] ?? k}
                        <input
                          name={`cfg_${k}`}
                          type="number"
                          defaultValue={cfg[k]}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                        />
                      </label>
                    ))}
                  </div>
                )}
                <SubmitButton size="sm" pendingText="Saving…">Save</SubmitButton>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
