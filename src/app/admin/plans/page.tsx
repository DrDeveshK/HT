import { requireRole } from "@/lib/auth";
import { getAllPlans, planFeatures } from "@/lib/plans";
import { updatePlan } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Badge, Field, Input } from "@/components/ui";

export default async function AdminPlans() {
  await requireRole("PLATFORM_ADMIN");
  const plans = await getAllPlans();

  return (
    <>
      <PageHeader title="Plans" subtitle="Subscription tiers hoteliers can buy — edit price and availability." />
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {p.name} <span className="text-xs text-slate-400">({p.key})</span>
              </h3>
              <Badge tone={p.active ? "green" : "slate"}>{p.active ? "Active" : "Hidden"}</Badge>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
              {planFeatures(p.featuresJson).map((f) => <li key={f}>• {f}</li>)}
            </ul>
            <form action={updatePlan} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price / month (₹)"><Input name="priceRupees" type="number" min={0} defaultValue={p.pricePaise / 100} /></Field>
                <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
                  <input type="checkbox" name="active" defaultChecked={p.active} /> Active
                </label>
              </div>
              <Field label="Blurb"><Input name="blurb" defaultValue={p.blurb ?? ""} /></Field>
              <SubmitButton size="sm" pendingText="Saving…">Save</SubmitButton>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
