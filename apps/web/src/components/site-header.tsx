import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";

export async function SiteHeader() {
  const session = await auth();
  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;

  return (
    <header className="border-b border-text/10">
      <div className="mx-auto flex max-w-4xl flex-row flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex-col sm:gap-y-3 sm:px-6 sm:py-3">
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
          <Link href="/projekte" className="inline-flex min-h-11 items-center">
            Projekte
          </Link>
          <Link href="/termine" className="inline-flex min-h-11 items-center">
            Kalender
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/projekte/neu"
                className="inline-flex min-h-11 items-center"
              >
                Projekt eintragen
              </Link>
              <Link
                href="/termine/neu"
                className="inline-flex min-h-11 items-center"
              >
                Termin eintragen
              </Link>
              <Link
                href="/meine-projekte"
                className="inline-flex min-h-11 items-center"
              >
                Meine Projekte
              </Link>
              {admin ? (
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center"
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
                  className="inline-flex min-h-11 items-center"
                >
                  Abmelden
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/anmelden" className="inline-flex min-h-11 items-center">
                Anmelden
              </Link>
              <Link
                href="/registrieren"
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-white transition-colors hover:bg-primary-hover"
              >
                Registrieren
              </Link>
            </>
          )}
        </nav>

        {/*
          Plain GET form — no JS needed, the browser navigates to
          /projekte?suche=... on submit. Matches against a listing's own
          text fields as well as its events' title/description (see
          /projekte/page.tsx), so a keyword found in either a project's own
          content or one of its Termine surfaces that project in the
          results list.
        */}
        <form action="/projekte" method="GET" className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            name="suche"
            placeholder="Projekte & Termine durchsuchen…"
            aria-label="Projekte & Termine durchsuchen"
            className="min-h-11 w-full rounded-full border border-text/20 bg-bg py-2 pl-9 pr-3 text-sm"
          />
        </form>
      </div>
    </header>
  );
}
