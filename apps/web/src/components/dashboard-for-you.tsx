import Link from "next/link";
import { CalendarHeart, Compass, Heart, Home, Landmark, Megaphone, Search, Sparkles } from "lucide-react";

import type { UserRole } from "@/generated/prisma/client";

type Card = { href: string; title: string; text: string; icon: typeof Home; tone: "projekt" | "termin" };

// Suggested next steps per interest (see src/lib/user-roles.ts). Order of
// INTEREST order; duplicates (same href) are shown once.
const CARDS: Partial<Record<UserRole, Card[]>> = {
  SUCHENDE: [
    { href: "/projekte", title: "Projekte entdecken", text: "Gemeinschaften in deiner Nähe finden und Kontakt aufnehmen.", icon: Search, tone: "projekt" },
    { href: "/mein-konto/favoriten", title: "Meine Favoriten", text: "Gemerkte Projekte und Termine und was es dort Neues gibt.", icon: Heart, tone: "projekt" },
  ],
  INFORMIEREN: [
    { href: "/termine", title: "Leute kennenlernen", text: "Infotage, Besuchstage und Treffen, bei denen du einfach vorbeischauen kannst.", icon: CalendarHeart, tone: "termin" },
    { href: "/ueber-uns#idee", title: "Gemeinschaftlich wohnen", text: "Was es alles gibt, von der WG bis zum Ökodorf.", icon: Compass, tone: "projekt" },
  ],
  ANBIETER: [
    { href: "/projekte/neu", title: "Wohnprojekt vorstellen", text: "Euer Projekt eintragen, gern auch per KI-Import von eurer Homepage.", icon: Home, tone: "projekt" },
  ],
  VERANSTALTER: [
    { href: "/termine/neu", title: "Veranstaltung eintragen", text: "Infotag, Besuchstag oder Workshop in den gemeinsamen Kalender stellen.", icon: Megaphone, tone: "termin" },
  ],
  ORGANISATION: [
    { href: "/ueber-uns#organisationen", title: "Als Organisation dabei", text: "Wie Vereine, Genossenschaften und Initiativen LiGem nutzen können.", icon: Landmark, tone: "projekt" },
  ],
};

const ORDER: UserRole[] = ["SUCHENDE", "INFORMIEREN", "ANBIETER", "VERANSTALTER", "ORGANISATION"];

export function DashboardForYou({ roles }: { roles: UserRole[] }) {
  const chosen = new Set(roles);
  const seen = new Set<string>();
  const cards = ORDER.filter((r) => chosen.has(r))
    .flatMap((r) => CARDS[r] ?? [])
    .filter((c) => (seen.has(c.href) ? false : (seen.add(c.href), true)));

  if (cards.length === 0) {
    return (
      <Link
        href="/mein-konto#vorhaben"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold">Was hast du auf LiGem vor?</span>
          <span className="block text-sm text-text-muted">
            Sag uns kurz, ob du ein Zuhause suchst, dich informierst oder etwas anbietest. Dann zeigen wir dir hier
            zuerst, was dazu passt.
          </span>
        </span>
      </Link>
    );
  }

  return (
    <section aria-labelledby="fuer-dich">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="fuer-dich" className="text-lg font-semibold">
          Für dich
        </h2>
        <Link href="/mein-konto#vorhaben" className="text-sm font-semibold text-primary hover:underline">
          Ändern
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  card.tone === "termin" ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{card.title}</span>
                <span className="block text-sm text-text-muted">{card.text}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
