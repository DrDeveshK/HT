import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setModule } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Badge } from "@/components/ui";

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
  const modules = await prisma.revenueModule.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader
        title="Revenue modules"
        subtitle="Toggle any monetization stream on/off and set its rates. Changes take effect immediately in deputation pricing."
      />
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
