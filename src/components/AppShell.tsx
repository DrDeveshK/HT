import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { logoutAction } from "@/actions/auth";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export function AppShell({
  section,
  navItems,
  userName,
  userMeta,
  headerRight,
  children,
}: {
  section: string;
  navItems: NavItem[];
  userName: string;
  userMeta?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">HT</span>
            </Link>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            {headerRight}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{userName}</p>
              {userMeta && <p className="text-xs text-slate-500">{userMeta}</p>}
            </div>
            <form action={logoutAction}>
              <button className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">Log out</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2">
          <nav className="flex gap-1">
            {navItems.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} exact={n.exact} />
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
