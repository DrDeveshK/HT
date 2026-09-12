import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addAmenity, setAmenityActive, setSetting } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Field, Input } from "@/components/ui";

export default async function AdminSettings() {
  await requireRole("PLATFORM_ADMIN");
  const [amenities, settings] = await Promise.all([
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    prisma.platformSetting.findMany({ orderBy: { key: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Amenities catalogue and platform configuration." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Amenities" subtitle={`${amenities.length} total · click to toggle`} />
          <div className="space-y-4 p-5">
            <form action={addAmenity} className="flex items-end gap-2">
              <div className="flex-1"><Field label="New amenity"><Input name="name" placeholder="e.g. Rooftop Pool" required /></Field></div>
              <SubmitButton pendingText="Adding…">Add</SubmitButton>
            </form>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <form key={a.id} action={setAmenityActive} className="inline">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(!a.active)} />
                  <button
                    className={`rounded-full border px-3 py-1 text-xs ${a.active ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-400 line-through"}`}
                    title="Toggle active"
                  >
                    {a.name}
                  </button>
                </form>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Platform settings" subtitle="Key / value config (used by fees, savings, etc.)" />
          <div className="space-y-4 p-5">
            <form action={setSetting} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Key"><Input name="key" placeholder="savings.retrainCostPaise" /></Field>
                <Field label="Value"><Input name="value" placeholder="1500000" /></Field>
              </div>
              <SubmitButton size="sm" pendingText="Saving…">Set</SubmitButton>
            </form>
            {settings.length > 0 && (
              <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                {settings.map((s) => (
                  <div key={s.key} className="flex justify-between gap-2">
                    <span className="text-slate-600">{s.key}</span>
                    <span className="font-mono text-xs text-slate-800">{s.valueJson}</span>
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
