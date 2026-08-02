import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { HeaderSearchForm } from "@/components/header-search-form";

export async function SiteHeader() {
  const session = await auth();
  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;
  const displayName = session?.user?.name ?? session?.user?.email ?? "Konto";

  return (
    <header className="border-b border-text/10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-x-4 gap-y-1 px-4 py-2 sm:gap-y-3 sm:px-6 sm:py-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="LiGem - Leben in Gemeinschaft"
            width={1280}
            height={460}
            priority
            className="h-9 w-auto mix-blend-multiply sm:h-20 md:h-24"
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

          <Link href="/projekte" className="inline-flex min-h-11 items-center">
            Projekte
          </Link>
          <Link href="/termine" className="inline-flex min-h-11 items-center">
            Kalender
          </Link>

          {session?.user ? (
            // A native <details>/<summary> account menu — no client JS
            // needed, consistent with every other collapsed-disclosure
            // pattern in this app (see MultiSelectDropdown). "Projekt
            // eintragen"/"Termin eintragen" used to be separate top-level
            // nav entries; they're now reached via /meine-projekte instead,
            // which lists both alongside the user's own listings.
            <details className="relative">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 select-none [&::-webkit-details-marker]:hidden">
                {displayName}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-10 mt-1 flex w-48 flex-col overflow-hidden rounded-xl border border-text/10 bg-surface py-1 shadow-lg">
                <Link
                  href="/mein-konto"
                  className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg"
                >
                  Mein Konto
                </Link>
                <Link
                  href="/meine-projekte"
                  className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg"
                >
                  Meine Projekte
                </Link>
                {admin ? (
                  <Link
                    href="/admin"
                    className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg"
                  >
                    Admin
                  </Link>
                ) : null}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="min-h-11 w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg"
                  >
                    Abmelden
                  </button>
                </form>
              </div>
            </details>
          ) : (
            // "Registrieren" isn't a separate nav entry — /anmelden already
            // offers it as an option ("Noch kein Konto? Registrieren") right
            // below the login form, so the nav only needs one entry point.
            <Link
              href="/anmelden"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-white transition-colors hover:bg-primary-hover"
            >
              Anmelden
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
