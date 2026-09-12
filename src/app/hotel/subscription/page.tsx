import { requireRole } from "@/lib/auth";
import { changePlan } from "@/actions/subscription";
import { getActivePlans, planFeatures } from "@/lib/plans";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatINR, formatDate } from "@/lib/constants";

export default async function SubscriptionPage() {
  const user = await requireRole("HOTELIER_ADMIN");
  const sub = user.hotel?.subscription;
  const current = sub?.plan ?? "FREE";
  const plans = await getActivePlans();

  return (
    <>
      <PageHeader title="Subscription" subtitle="Your SaaS plan — the platform's core revenue stream." />

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Current plan: <span className="font-semibold text-slate-900">{current}</span> · status {sub?.status ?? "—"}
        {sub?.currentPeriodEnd ? ` · renews ${formatDate(sub.currentPeriodEnd)}` : ""}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.key === current;
          return (
            <Card key={p.id} className={cn("flex flex-col p-5", isCurrent && "ring-2 ring-brand-500")}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                {isCurrent && <Badge tone="blue">Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {p.pricePaise === 0 ? "Free" : formatINR(p.pricePaise)}
                {p.pricePaise > 0 && <span className="text-sm font-normal text-slate-400">/mo</span>}
              </p>
              {p.blurb && <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>}
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                {planFeatures(p.featuresJson).map((f) => <li key={f}>• {f}</li>)}
              </ul>
              <form action={changePlan} className="mt-4">
                <input type="hidden" name="plan" value={p.key} />
                <SubmitButton variant={isCurrent ? "secondary" : "primary"} className="w-full" pendingText="Updating…">
                  {isCurrent ? "Current plan" : p.pricePaise === 0 ? "Downgrade to Free" : "Choose plan"}
                </SubmitButton>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
