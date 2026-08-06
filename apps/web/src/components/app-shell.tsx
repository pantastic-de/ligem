import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Home,
  Calendar,
  UserRound,
  ShieldCheck,
} from "lucide-react";

export type AppShellSection =
  | "dashboard"
  | "projekte"
  | "termine"
  | "konto"
  | "admin-dashboard"
  | "admin-nutzer"
  | "admin-projekte"
  | "admin-termine"
  // Reachable from the admin dashboard's own quick-link tiles rather than
  // the persistent rail (which mirrors the mockup's fixed 4-item admin nav)
  // — no RailGroup item matches these, so nothing highlights, same as any
  // other "child page one level below the rail" would behave.
  | "admin-kategorien"
  | "admin-attribute"
  | "admin-statistik"
  | "admin-demo-daten";

type NavItem = {
  section: AppShellSection;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
};

/**
 * Shared shell (persistent sidebar + content area) for every "verwalten"
 * page — both the admin backend and a regular user's own account/projects/
 * termine. One component serves both, just with a different nav item set
 * and different hrefs/queries per caller (see each page for how it scopes
 * its own data) — this is what makes "gleiche Oberfläche, nur auf eigene
 * Daten beschränkt" a single, consistent pattern instead of two parallel
 * UIs that drift apart over time.
 *
 * Deliberately sits *below* the existing site-wide `SiteHeader` (rendered
 * once in root layout.tsx for every route, public pages included) rather
 * than replacing it — this avoids needing to suppress that header
 * conditionally per route (App Router layouts can only add to what an
 * ancestor layout rendered, never remove it), and keeps the one already-
 * working top-level nav/account-menu/login-state entirely untouched.
 *
 * Server Component: the nav itself needs no client interactivity (plain
 * links, no live filtering), matching this app's general preference for
 * plain markup over client state where a static list suffices.
 */
export function AppShell({
  active,
  isAdmin,
  displayName,
  children,
}: {
  active: AppShellSection;
  isAdmin: boolean;
  displayName: string;
  children: React.ReactNode;
}) {
  const personalNav: NavItem[] = [
    { section: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { section: "projekte", href: "/meine-projekte", label: "Meine Projekte", icon: Home },
    { section: "termine", href: "/meine-termine", label: "Meine Termine", icon: Calendar },
    { section: "konto", href: "/mein-konto", label: "Mein Konto", icon: UserRound },
  ];
  const adminNav: NavItem[] = [
    { section: "admin-dashboard", href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { section: "admin-nutzer", href: "/admin/nutzer", label: "Nutzer:innen", icon: Users },
    { section: "admin-projekte", href: "/admin/projekte", label: "Projekte prüfen", icon: Home },
    { section: "admin-termine", href: "/admin/termine", label: "Termine prüfen", icon: Calendar },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:gap-6">
      <nav
        aria-label="Verwaltung"
        className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-2 shadow-sm lg:sticky lg:top-6 lg:w-60 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3"
      >
        <RailGroup label={isAdmin ? "Meine Verwaltung" : undefined} items={personalNav} active={active} />
        {isAdmin ? (
          <>
            <div
              aria-hidden="true"
              className="mx-2 my-2 hidden h-px shrink-0 bg-bg lg:block"
            />
            <span className="hidden items-center gap-1.5 px-2.5 pb-1 text-xs font-bold tracking-wide text-text-muted uppercase lg:flex">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Admin
            </span>
            <RailGroup items={adminNav} active={active} />
          </>
        ) : null}
        <div className="mt-3 hidden items-center gap-2 rounded-xl bg-bg px-3 py-2 text-sm text-text-muted lg:flex">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-text"
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{displayName}</span>
        </div>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function RailGroup({
  label,
  items,
  active,
}: {
  label?: string;
  items: NavItem[];
  active: AppShellSection;
}) {
  return (
    <div className="flex gap-1 lg:flex-col lg:gap-0.5">
      {label ? (
        <span className="hidden px-2.5 pb-1 text-xs font-bold tracking-wide text-text-muted uppercase lg:block">
          {label}
        </span>
      ) : null}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.section === active;
        return (
          <Link
            key={item.section}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              isActive ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {item.label}
            {item.count ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-xs font-bold text-white">
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
