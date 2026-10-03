import { Suspense } from "react";
import Link from "next/link";
import { FileText, Heart, Hourglass, LogIn } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { getOpenRequestsCount, getLatestOpenRequestHref } from "@/lib/open-requests";
import { getPendingReviewIndicator } from "@/lib/pending-review";
import { FAVORITES_PAGE, getFavoriteNewsCount } from "@/lib/favorites";
import { getPendingDataExportCount } from "@/lib/data-export";
import { HeaderSearchForm } from "@/components/header-search-form";
import { AccountMenu } from "@/components/account-menu";
import { ACTION_TONE_CLASSES } from "@/lib/action-color";
import { EntityIconBadge } from "@/components/entity-icon-badge";

export async function SiteHeader() {
  const session = await auth();
  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;
  const openRequestsCount = session?.user?.id ? await getOpenRequestsCount(session.user.id) : 0;
  const openRequestsHref =
    session?.user?.id && openRequestsCount > 0 ? await getLatestOpenRequestHref(session.user.id) : null;
  const pendingReview = session?.user?.id ? await getPendingReviewIndicator(session.user.id, admin) : null;
  const favoriteNewsCount = session?.user?.id ? await getFavoriteNewsCount(session.user.id) : 0;
  const dataExportCount = admin ? await getPendingDataExportCount() : 0;
  const displayName = session?.user?.name ?? session?.user?.email ?? "Konto";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="border-b border-text/10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-x-4 gap-y-6 px-4 py-2 sm:gap-y-10 sm:px-6 sm:py-3 lg:flex-row lg:justify-between lg:gap-y-0 lg:py-4">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image
              refuses SVG sources unless dangerouslyAllowSVG is set (a
              site-wide setting with real security implications for any
              future dynamic image source); this is our own trusted static
              vector logo, so a plain <img> is simpler and avoids that
              tradeoff entirely. The SVG already has a transparent
              background, so no mix-blend-mode trick is needed here (unlike
              the old PNG export). */}
          <img
            src="/logo.svg"
            alt="LiGem - Leben in Gemeinschaft"
            width={1520}
            height={390}
            className="h-10 w-auto sm:h-12 md:h-14"
          />
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium sm:flex-none sm:justify-center sm:gap-x-5 sm:gap-y-2">
          {/*
            Placed first in the nav row (before "Projekte"/"Kalender") so it
            shares their line whenever there's room, wrapping along with the
            rest of the nav on narrow viewports like any other item here.
            Suspense is required here because HeaderSearchForm calls
            useSearchParams() in a Client Component rendered from this
            server-rendered layout — without it, Next.js would opt the
            entire route into fully client-side rendering just for this one
            small field. Nothing above/below it depends on the search
            params, so an empty fallback (invisible either way, given how
            fast this resolves) is fine.
          */}
          <Suspense fallback={null}>
            <HeaderSearchForm />
          </Suspense>

          <Link href="/projekte" className="group flex flex-col items-center gap-1">
            <EntityIconBadge tone="projekt" size="xl" className="transition-transform group-hover:scale-105" />
            <span className="text-xs font-medium text-primary transition-colors group-hover:text-primary-hover">
              Projekte
            </span>
          </Link>
          <Link href="/termine" className="group flex flex-col items-center gap-1">
            <EntityIconBadge tone="termin" size="xl" className="transition-transform group-hover:scale-105" />
            <span className="text-xs font-medium text-secondary transition-colors group-hover:text-secondary-hover">
              Termine
            </span>
          </Link>

          {pendingReview ? (
            // Listings waiting for moderation: admins see the whole queue and
            // land on it, managers see their own listings (see pending-review.ts).
            <Link
              href={pendingReview.href}
              title={pendingReview.label}
              className="group flex max-w-40 flex-col items-center gap-1 text-center"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-error/15 text-error transition-colors group-hover:bg-error/25">
                <Hourglass className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
                  {pendingReview.count}
                </span>
              </span>
              <span className="text-xs font-medium leading-tight text-error">{pendingReview.label}</span>
            </Link>
          ) : null}

          {dataExportCount > 0 ? (
            // Admins: requested data exports waiting for approval.
            <Link
              href="/admin/datenauskunft"
              title="Angefragte Datenauskünfte prüfen"
              className="group flex max-w-40 flex-col items-center gap-1 text-center"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-error/15 text-error transition-colors group-hover:bg-error/25">
                <FileText className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
                  {dataExportCount}
                </span>
              </span>
              <span className="text-xs font-medium leading-tight text-error">
                {dataExportCount === 1 ? "1 Datenauskunft offen" : `${dataExportCount} Datenauskünfte offen`}
              </span>
            </Link>
          ) : null}

          {favoriteNewsCount > 0 ? (
            // News from the user's favorites since they last opened the
            // favorites page (see src/lib/favorites.ts).
            <Link
              href={`${FAVORITES_PAGE}#neuigkeiten`}
              title="Neuigkeiten bei deinen Favoriten ansehen"
              className="group flex max-w-40 flex-col items-center gap-1 text-center"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-error/15 text-error transition-colors group-hover:bg-error/25">
                <Heart className="h-5 w-5 fill-error" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
                  {favoriteNewsCount}
                </span>
              </span>
              <span className="text-xs font-medium leading-tight text-error">
                {favoriteNewsCount === 1 ? "1 Neuigkeit" : `${favoriteNewsCount} Neuigkeiten`}
              </span>
            </Link>
          ) : null}

          {session?.user ? (
            // "Projekt eintragen"/"Termin eintragen" used to be separate
            // top-level nav entries; they're now reached via /meine-projekte
            // instead, which lists both alongside the user's own listings.
            // The menu itself is a small client island (AccountMenu) purely
            // so it can close after a click on one of its own items — see
            // that component for why a plain <details> alone doesn't do
            // that across a client-side navigation.
            <AccountMenu
              displayName={displayName}
              admin={admin}
              openRequestsCount={openRequestsCount}
              openRequestsHref={openRequestsHref}
              signOutAction={handleSignOut}
            />
          ) : (
            // "Registrieren" isn't a separate nav entry — /anmelden already
            // offers it as an option ("Noch kein Konto? Registrieren") right
            // below the login form, so the nav only needs one entry point.
            <Link href="/anmelden" className="group flex flex-col items-center gap-1">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors group-hover:bg-accent/35 ${ACTION_TONE_CLASSES.verwaltung}`}
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-accent transition-colors group-hover:text-accent/80">
                Anmelden
              </span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
