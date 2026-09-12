import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">
            HT
          </span>
          <span className="text-lg font-semibold">Hospitality Talent Exchange</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
            Get started
          </Link>
        </nav>
      </header>

      <section className="grid gap-10 py-14 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Pan-India · counter-seasonal staffing
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            Move your staff to where the season is.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            The housekeeper idle in Goa&apos;s monsoon is premium labour in the Himalayan
            summer. HT lets hotels lend surplus off-season staff to peak-season hotels — and
            pull them back when the season returns. No layoffs. No frantic rehiring.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700">
              Onboard your hotel
            </Link>
            <Link href="/login" className="rounded-md border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
              I already have an account
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Demo logins are seeded — see the README.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            How it works
          </h2>
          <ol className="mt-4 space-y-4">
            {[
              ["Declare your season", "Mark your hotel as SURPLUS (staff to lend) or DEMAND (staff needed)."],
              ["See the national map", "Live view of which regions are peaking vs troughing, with suggested corridors."],
              ["Match & request", "Find ranked, verified staff and send a deputation request."],
              ["Deputation + return", "Digital agreement, transparent pay splits, guaranteed return ticket home."],
            ].map(([title, body], i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{title}</p>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-sm text-slate-500">
        HT — Hospitality Talent Exchange · MVP
      </footer>
    </main>
  );
}
