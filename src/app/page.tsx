import Link from "next/link";

const STATS: [string, string][] = [
  ["₹282B", "India hospitality market"],
  ["176", "destinations · every state & UT"],
  [">40%", "sector attrition we help cut"],
  ["10–12mo", "work/year vs 6–8 seasonal"],
];

const STEPS: [string, string][] = [
  ["Declare your season", "Mark your hotel SURPLUS (staff to lend) or DEMAND (staff needed)."],
  ["See the national map", "Live view of 176 destinations peaking vs troughing right now."],
  ["Match & negotiate", "Ranked, verified staff. Agree wage and terms in a click."],
  ["Deputation & return", "Digital agreement, fair pay, and a guaranteed way home."],
];

const FEATURES: [string, string][] = [
  ["National season map", "Live PEAK / SHOULDER / OFF across every state & UT — spot corridors instantly."],
  ["Smart matching", "Ranked by role, skills, counter-seasonality, wage fit and reputation."],
  ["Two-way ratings", "Hotels rate staff; staff rate hotels. Both sides choose with confidence."],
  ["Price negotiation", "Offer and counter-offer on wage, dates and housing — terms lock into the agreement."],
  ["Managed compliance", "Inter-state payroll, KYC and insurance handled as an optional module."],
  ["Savings & analytics", "See exactly what you save vs layoff → rehire → retrain."],
];

function SeasonCard({ place, sub, tone, label, note }: { place: string; sub: string; tone: "off" | "peak"; label: string; note: string }) {
  const styles =
    tone === "off"
      ? { ring: "ring-sky-200", chip: "bg-sky-100 text-sky-700", dot: "bg-sky-500" }
      : { ring: "ring-red-200", chip: "bg-red-100 text-red-700", dot: "bg-red-500" };
  return (
    <div className={`rounded-xl bg-white p-4 ring-1 ${styles.ring}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900">{place}</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {label}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
      <p className="mt-3 text-sm text-slate-600">{note}</p>
    </div>
  );
}

function ValueCol({ title, tone, points }: { title: string; tone: "brand" | "accent"; points: string[] }) {
  const dot = tone === "brand" ? "text-brand-600" : "text-accent-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-slate-600">
            <span className={`mt-1 shrink-0 ${dot}`}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-hero">
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 font-bold text-white shadow-soft">HT</span>
            <span className="font-semibold tracking-tight text-slate-900">Hospitality Talent Exchange</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 sm:block">How it works</a>
            <a href="#value" className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 sm:block">Why HT</a>
            <Link href="/login" className="rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Pan-India · counter-seasonal staffing
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 md:text-6xl">
            Move your staff to <span className="text-gradient">where the season is.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            The housekeeper idle in Goa&apos;s monsoon is premium talent in the Himalayan summer. HT lets hotels lend
            off-season staff to peak-season hotels — and pull them back when the season turns. No layoffs. No scramble.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 font-semibold text-white shadow-soft transition hover:opacity-95">
              Onboard your hotel
            </Link>
            <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
              See the live demo
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">Demo logins seeded — hotelier, worker &amp; admin. Password in the README.</p>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-soft backdrop-blur">
            <div className="grid grid-cols-2 gap-4">
              <SeasonCard place="Goa" sub="Monsoon" tone="off" label="Off-season" note="Trained staff sitting idle." />
              <SeasonCard place="Manali" sub="Autumn peak" tone="peak" label="Peak" note="Scrambling for staff." />
            </div>
            <div className="my-4 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-brand-400" />
              deputation
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-accent-400" />
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Ramesh · Housekeeping</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">92% match</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>★ 4.6 · KYC ✓ · housing provided</span>
                <span className="font-medium text-slate-500">₹900/day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200/70 bg-white/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {STATS.map(([n, l]) => (
            <div key={l}>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{n}</p>
              <p className="mt-1 text-sm text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">A four-step loop that keeps trained people employed year-round.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{i + 1}</span>
              <p className="mt-4 font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual value */}
      <section id="value" className="border-y border-slate-200/70 bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">A win for both sides</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <ValueCol
              title="For hoteliers"
              tone="brand"
              points={[
                "Cut off-season payroll overhead — lend, don't lay off.",
                "On-demand trained, verified, housing-ready staff in peak season.",
                "Rehire the people you trust, season after season.",
                "Transparent pricing and a clear savings dashboard.",
              ]}
            />
            <ValueCol
              title="For staff"
              tone="accent"
              points={[
                "Near year-round income across seasons — not 6 months of work.",
                "Choose good employers from real, verified reviews.",
                "A portable reputation and KYC that travels with you.",
                "Housing, fair pay, and a guaranteed way home.",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Built for trust on both sides</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:shadow-soft">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-accent-500 px-8 py-14 text-center shadow-soft">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Turn off-season overhead into on-demand talent.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Join the network that keeps hospitality staff working across seasons — and helps mid & budget hotels save on every off-season.</p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-slate-100">Get started free</Link>
            <Link href="/login" className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Log in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-8 text-sm text-slate-500">
          <span>HT — Hospitality Talent Exchange</span>
          <span>Pan-India · MVP</span>
        </div>
      </footer>
    </div>
  );
}
