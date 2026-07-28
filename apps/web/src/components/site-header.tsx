import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";

export async function SiteHeader() {
  const session = await auth();
  const admin = session?.user?.id ? await isAdmin(session.user.id) : false;

  return (
    <header className="border-b border-text/10">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="py-2">
          <Image
            src="/logo.png"
            alt="LiGem - Leben in Gemeinschaft"
            width={1280}
            height={460}
            priority
            className="h-10 w-auto mix-blend-multiply sm:h-12"
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          <Link href="/projekte" className="inline-flex min-h-11 items-center">
            Projekte
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
      </div>
    </header>
  );
}
