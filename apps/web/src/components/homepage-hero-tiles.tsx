"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Users2 } from "lucide-react";

export type HeroPoolItem = {
  key: string;
  src: string;
  alt: string;
  label?: string;
  href?: string;
  // Only set for a real listing/event (never for a curated fallback mood
  // photo) — drives the small "Beispielprojekt"/"Beispieltermin" badge so
  // visitors understand these are real, clickable example listings/events,
  // not decorative stock photography.
  kind?: "projekt" | "termin";
};

const HERO_TILE_GRID_CLASS = ["col-span-2", "", "", "col-span-2"];
const HERO_TILE_VISUAL_CLASS = [
  "aspect-[4/3] -rotate-1",
  "aspect-square rotate-2",
  "aspect-square -rotate-2",
  "aspect-[16/9] rotate-1",
];

// How often the displayed examples change, and how long the crossfade
// between one set and the next takes.
const ROTATE_INTERVAL_MS = 6000;
const FADE_DURATION_MS = 400;

/**
 * The homepage hero's bento-grid image tiles — 3 listing tiles + 1 event
 * tile, each showing a real example (see HeroPoolItem.kind) or a curated
 * fallback mood photo when there aren't enough real ones yet (see
 * page.tsx's getHeroPools()). A client island (the rest of the homepage
 * stays a server component) so it can rotate through a larger pool of
 * candidates on an interval instead of only ever showing the one random set
 * picked at request time — `listingPool`/`eventPool` are fetched once,
 * server-side, and sized larger than what's actually shown (see
 * page.tsx) specifically so this rotation has real variety to cycle
 * through, not just the same handful reshuffled.
 */
export function HomepageHeroTiles({
  listingPool,
  eventPool,
  upcomingEventsCount,
  publishedListingsCount,
}: {
  listingPool: HeroPoolItem[];
  eventPool: HeroPoolItem[];
  upcomingEventsCount: number;
  publishedListingsCount: number;
}) {
  const [offset, setOffset] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Auto-rotating content is itself a motion/distraction concern beyond
    // just the fade transition, so a reduced-motion preference skips the
    // rotation entirely (stays on the one set picked at page load) rather
    // than just dropping the fade animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let fadeOutTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFading(true);
      fadeOutTimeout = setTimeout(() => {
        setOffset((o) => o + 1);
        setFading(false);
      }, FADE_DURATION_MS);
    }, ROTATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeOutTimeout);
    };
  }, []);

  // Each tick advances the 3 listing tiles to a genuinely new trio (rather
  // than just reshuffling the same 3 into different slots) by multiplying
  // the offset by 3 — with a large-enough pool (see getHeroPools()) this
  // means several full ticks pass before any listing repeats. The single
  // event tile just advances by one through its own, separate pool.
  const tiles: HeroPoolItem[] = [
    listingPool[(offset * 3) % listingPool.length],
    listingPool[(offset * 3 + 1) % listingPool.length],
    listingPool[(offset * 3 + 2) % listingPool.length],
    eventPool[offset % eventPool.length],
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((image, index) => {
          const isLastTile = index === tiles.length - 1;
          const content = (
            <div
              className={`h-full w-full transition-opacity motion-reduce:transition-none ${fading ? "opacity-0" : "opacity-100"}`}
              style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 80vw"
                priority={index === 0}
                className="object-cover"
              />
              {image.kind && (
                <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-secondary shadow-sm">
                  {image.kind === "projekt" ? "Beispielprojekt" : "Beispieltermin"}
                </span>
              )}
              {image.label && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
                  <p className="truncate text-center text-sm font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.6)]">
                    {image.label}
                  </p>
                </div>
              )}
            </div>
          );
          return (
            <div key={index} className={`relative ${HERO_TILE_GRID_CLASS[index]}`}>
              <div
                className={`relative overflow-hidden rounded-3xl shadow-lg ${HERO_TILE_VISUAL_CLASS[index]}`}
              >
                {image.href ? (
                  <Link href={image.href} className="absolute inset-0 block" aria-label={image.label}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
              {isLastTile && upcomingEventsCount > 0 && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-lg">
                  <CalendarDays className="h-6 w-6 shrink-0 text-secondary" aria-hidden="true" />
                  <p className="whitespace-nowrap text-sm font-medium leading-snug">
                    {upcomingEventsCount}{" "}
                    {upcomingEventsCount === 1 ? "Veranstaltung" : "Veranstaltungen"} auf LiGem
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {publishedListingsCount > 0 && (
        <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-lg sm:-left-6 sm:translate-x-0">
          <Users2 className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p className="whitespace-nowrap text-sm font-medium leading-snug">
            Bereits {publishedListingsCount}{" "}
            {publishedListingsCount === 1 ? "Wohnprojekt" : "Wohnprojekte"} auf LiGem
          </p>
        </div>
      )}
    </div>
  );
}
