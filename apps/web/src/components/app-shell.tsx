import Link from "next/link";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { ACTION_TONE_CLASSES } from "@/lib/action-color";

export type AppShellSection =
  | "dashboard"
  | "projekte"
  | "termine"
  | "konto"
  | "admin-dashboard"
  | "admin-nutzer"
  | "admin-projekte"
  | "admin-termine"
  | "admin-kategorien"
  | "admin-attribute"
  | "admin-statistik"
  | "admin-demo-daten";

const PERSONAL_SECTIONS: AppShellSection[] = ["dashboard", "projekte", "termine", "konto"];

/**
 * Shared shell (persistent sidebar + content area) for every "verwalten"
 * page — both the admin backend and a regular user's own account/projects/
 * termine. One component serves both; the rail itself is deliberately just
 * two entry points (Dashboard / Admin-Dashboard, the latter only for
 * admins) rather than one link per page — every other page (Meine
 * Projekte, Meine Termine, Mein Konto, Nutzer:innen, Projekte/Termine
 * prüfen, Kategorien, Attribute, Statistik, Demo-Daten, and every
 * Projekt-/Termin-Verwaltungsseite) is already one click away from one of
 * the two dashboards, so a full sub-nav would just duplicate those links —
 * per explicit product decision, the dashboards themselves are the menu.
 * `active` still selects which of the two rail entries lights up (any
 * personal-area page keeps "Dashboard" highlighted, any admin-area page
 * keeps "Admin-Dashboard" highlighted), so deep pages still show which
 * side of the app you're in without needing their own rail item.
 *
 * Deliberately sits *below* the existing site-wide `SiteHeader` (rendered
 * once in root layout.tsx for every route, public pages included) rather
 * than replacing it — this avoids needing to suppress that header
 * conditionally per route (App Router layouts can only add to what an
 * ancestor layout rendered, never remove it), and keeps the one already-
 * working top-level nav/account-menu/login-state entirely untouched.
 *
 * Server Component: the nav itself needs no client interactivity (plain
 * links), matching this app's general preference for plain markup over
 * client state where a static list suffices.
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
  const isPersonalActive = PERSONAL_SECTIONS.includes(active);
  const isAdminActive = active.startsWith("admin");

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:gap-6">
      <nav
        aria-label="Verwaltung"
        className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-2 shadow-sm lg:sticky lg:top-6 lg:w-60 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3"
      >
        <RailLink
          href="/dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          isActive={isPersonalActive}
          tone="projekt"
        />
        {isAdmin ? (
          <RailLink
            href="/admin"
            label="Admin-Dashboard"
            icon={ShieldCheck}
            isActive={isAdminActive}
            tone="verwaltung"
          />
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

function RailLink({
  href,
  label,
  icon: Icon,
  isActive,
  tone,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: boolean;
  tone: "projekt" | "verwaltung";
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
        isActive ? ACTION_TONE_CLASSES[tone] : "text-text-muted hover:bg-bg"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}
