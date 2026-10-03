import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Heart } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { FAVORITES_PAGE, FREQUENCY_OPTIONS, getFavoriteNews } from "@/lib/favorites";
import { AppShell } from "@/components/app-shell";
import { EntityIconBadge } from "@/components/entity-icon-badge";
import { FavoriteNewsList } from "@/components/favorite-news-list";
import type { FavoriteFrequency } from "@/generated/prisma/client";
import { removeFavorite, setFavoriteFrequency } from "./actions";

export const metadata: Metadata = {
  title: "Meine Favoriten",
  robots: { index: false, follow: false },
};

const eventDateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function hasStarted(date: Date): boolean {
  return date.getTime() < Date.now();
}

function FrequencyPicker({ kind, favoriteId, current }: { kind: "listing" | "event"; favoriteId: string; current: FavoriteFrequency }) {
  return (
    <form action={setFavoriteFrequency} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="favoriteId" value={favoriteId} />
      <span className="mr-1 text-sm text-text-muted">E-Mail bei Neuigkeiten:</span>
      {FREQUENCY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="submit"
          name="frequency"
          value={option.value}
          aria-pressed={current === option.value}
          className={`min-h-9 rounded-full px-3 text-sm font-medium transition-colors ${
            current === option.value ? "bg-secondary text-white" : "border border-text/20 hover:bg-bg"
          }`}
        >
          {option.label}
        </button>
      ))}
    </form>
  );
}

function RemoveButton({ kind, favoriteId }: { kind: "listing" | "event"; favoriteId: string }) {
  return (
    <form action={removeFavorite}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="favoriteId" value={favoriteId} />
      <button
        type="submit"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-error transition-colors hover:bg-error/10"
      >
        <Heart className="h-4 w-4 fill-error" aria-hidden="true" />
        Entfernen
      </button>
    </form>
  );
}

export default async function FavoritenPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/anmelden?weiter=${encodeURIComponent(FAVORITES_PAGE)}`);
  const userId = session.user.id;
  const { ok } = await searchParams;

  const [news, listings, events, admin] = await Promise.all([
    getFavoriteNews(userId),
    prisma.favoriteListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            projectName: true,
            slug: true,
            status: true,
            city: true,
            motto: true,
            media: { orderBy: { position: "asc" }, take: 1, select: { thumbnailKey: true, storageKey: true } },
          },
        },
      },
    }),
    prisma.favoriteEvent.findMany({
      where: { userId },
      orderBy: { event: { startAt: "asc" } },
      include: {
        event: {
          select: { title: true, slug: true, status: true, startAt: true, city: true, listing: { select: { projectName: true } } },
        },
      },
    }),
    isAdmin(userId),
  ]);
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  return (
    <AppShell active="favoriten" isAdmin={admin} displayName={displayName}>
      <h1 className="text-3xl font-bold">Meine Favoriten</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Projekte und Termine, die du mit dem Herz markiert hast. Wenn sie neue Termine eintragen oder etwas ändern,
        siehst du das hier und am roten Herz oben im Menü. Wie oft wir dir dazu eine E-Mail schreiben, stellst du
        bei jedem Favoriten selbst ein.
      </p>

      {ok === "entfernt" ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Aus deinen Favoriten entfernt.
        </p>
      ) : null}

      <section id="neuigkeiten" className="mt-8 scroll-mt-4 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Neuigkeiten der letzten 30 Tage</h2>
        <FavoriteNewsList items={news} />
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <EntityIconBadge tone="projekt" size="md" />
          Projekte ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <p className="mt-3 text-text-muted">
            Noch keine Projekte gemerkt. Auf der{" "}
            <Link href="/projekte" className="font-medium text-primary hover:underline">
              Projektsuche
            </Link>{" "}
            findest du bei jedem Projekt ein Herz.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-text/10">
            {listings.map((fav) => {
              const thumb = fav.listing.media[0];
              const isPublic = fav.listing.status === "PUBLISHED";
              return (
                <li key={fav.id} id={`favorit-${fav.id}`} className="flex scroll-mt-4 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- proxied media file
                    <img
                      src={`/api/media/${thumb.thumbnailKey ?? thumb.storageKey}`}
                      alt=""
                      className="aspect-[4/3] w-28 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      {isPublic ? (
                        <Link href={`/projekt/${fav.listing.slug}`} className="font-semibold text-primary hover:underline">
                          {fav.listing.projectName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{fav.listing.projectName}</span>
                      )}
                      <p className="text-sm text-text-muted">
                        {[fav.listing.city, fav.listing.motto].filter(Boolean).join(" · ")}
                        {isPublic ? "" : " · gerade nicht öffentlich sichtbar"}
                      </p>
                    </div>
                    <FrequencyPicker kind="listing" favoriteId={fav.id} current={fav.frequency} />
                  </div>
                  <RemoveButton kind="listing" favoriteId={fav.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <EntityIconBadge tone="termin" size="md" />
          Termine ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="mt-3 text-text-muted">
            Noch keine Termine gemerkt. Im{" "}
            <Link href="/termine" className="font-medium text-primary hover:underline">
              Kalender
            </Link>{" "}
            hat jeder Termin ein Herz.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-text/10">
            {events.map((fav) => {
              const isPublic = fav.event.status === "PUBLISHED";
              const isPast = hasStarted(fav.event.startAt);
              return (
                <li
                  key={fav.id}
                  id={`favorit-${fav.id}`}
                  className={`flex scroll-mt-4 flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start ${isPast ? "opacity-60" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      {isPublic ? (
                        <Link href={`/event/${fav.event.slug}`} className="font-semibold text-primary hover:underline">
                          {fav.event.title}
                        </Link>
                      ) : (
                        <span className="font-semibold">{fav.event.title}</span>
                      )}
                      <p className="text-sm text-text-muted">
                        {eventDateFormat.format(fav.event.startAt)} Uhr
                        {fav.event.city ? ` · ${fav.event.city}` : ""}
                        {fav.event.listing ? ` · von ${fav.event.listing.projectName}` : ""}
                        {isPast ? " · vorbei" : ""}
                        {isPublic ? "" : " · gerade nicht öffentlich sichtbar"}
                      </p>
                    </div>
                    <FrequencyPicker kind="event" favoriteId={fav.id} current={fav.frequency} />
                  </div>
                  <RemoveButton kind="event" favoriteId={fav.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
