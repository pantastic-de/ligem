"use client";

import { useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Users2 } from "lucide-react";

export type HeroPoolItem = {
  key: string;
  src: string;
  alt: string;
  label?: string;
  // A short second line under `label` — the listing's city for a Projekt
  // tile, or the hosting project's name for a Termin tile (its "location"
  // in the sense visitors care about: which project this Termin belongs
  // to). Absent for curated fallback mood photos, which have no label
  // either.
  sublabel?: string;
  href?: string;
  // Only set for a real listing/event (never for a curated fallback mood
  // photo) — drives the small "Wohnprojekt"/"Termin" badge so visitors
  // understand these are real, clickable entries, not decorative stock
  // photography.
  kind?: "projekt" | "termin";
};

const HERO_TILE_GRID_CLASS = ["col-span-2", "", "", "col-span-2"];
const HERO_TILE_VISUAL_CLASS = [
  "aspect-[4/3] -rotate-1",
  "aspect-square rotate-2",
  "aspect-square -rotate-2",
  "aspect-[16/9] rotate-1",
];

// Consecutive visible changes are spaced a random amount apart within these
// ranges, rather than a fixed period — reads as less mechanical/repetitive.
// The 3 listing tiles share one schedule on a round-robin (see
// useListingTrio, one of them changes at each tick); the lone event tile
// runs its own independent, slightly slower-paced random schedule.
const LISTING_TICK_RANGE_MS: [number, number] = [5000, 11000];
const EVENT_TICK_RANGE_MS: [number, number] = [8000, 13000];
// How long the incoming photo takes to slide/settle into place.
const ENTER_DURATION_MS = 650;

function randomTickDelay([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

type TileTransitionState = {
  current: HeroPoolItem;
  incoming: HeroPoolItem | null;
  entering: boolean;
};

function schedulePolaroidEnter(
  next: HeroPoolItem,
  setState: (updater: (prev: TileTransitionState) => TileTransitionState) => void,
  timers: { timeout?: ReturnType<typeof setTimeout>; raf1?: number; raf2?: number },
) {
  setState((s) => ({ ...s, incoming: next, entering: false }));
  // Two rAFs, not one: the browser needs to actually paint the "just
  // mounted" (opacity-0, offset) frame first, or the transition to the
  // settled state has no starting point to animate from and just snaps
  // straight to the end state instead.
  timers.raf1 = requestAnimationFrame(() => {
    timers.raf2 = requestAnimationFrame(() => {
      setState((s) => ({ ...s, entering: true }));
    });
  });
  timers.timeout = setTimeout(() => {
    setState(() => ({ current: next, incoming: null, entering: false }));
  }, ENTER_DURATION_MS);
}

/**
 * Drives the 3 listing tiles as one coordinated group sharing a single
 * monotonically increasing cursor into `pool` — the previous per-tile-
 * independent design could (and, reported directly, did) show the same
 * listing in two tiles at once, since each tile's own timer advanced
 * without knowing what the others were showing. Handing out `pool[cursor]`,
 * `cursor += 1` to exactly one tile per tick instead guarantees the 3
 * currently-shown items are always pairwise distinct for any pool of 3 or
 * more (the 3 most-recently-assigned cursor values, mod pool.length, can
 * never collide with each other), and that a tile changing always shows the
 * next not-recently-seen item rather than reshuffling the same 3.
 */
function useListingTrio(
  pool: HeroPoolItem[],
  pausedRefs: [RefObject<boolean>, RefObject<boolean>, RefObject<boolean>],
) {
  const [slots, setSlots] = useState<TileTransitionState[]>(() =>
    [0, 1, 2].map((i) => ({ current: pool[i % pool.length], incoming: null, entering: false })),
  );
  const poolRef = useRef(pool);
  const cursorRef = useRef(3);
  const turnRef = useRef(0);

  useEffect(() => {
    // Fewer than 4 distinct items means every "new" pick would just be one
    // of the 3 already on screen — not worth rotating at all.
    if (poolRef.current.length < 4) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: Array<{ timeout?: ReturnType<typeof setTimeout>; raf1?: number; raf2?: number }> = [
      {},
      {},
      {},
    ];
    let scheduleId: ReturnType<typeof setTimeout>;

    function tick() {
      const slot = turnRef.current;
      turnRef.current = (turnRef.current + 1) % 3;
      if (!pausedRefs[slot].current) {
        // this tile's turn — unless it's hovered, in which case it's just
        // left alone and gets another chance at its next turn
        const p = poolRef.current;
        const next = p[cursorRef.current % p.length];
        cursorRef.current += 1;

        schedulePolaroidEnter(
          next,
          (updater) =>
            setSlots((prev) => {
              const copy = [...prev];
              copy[slot] = updater(copy[slot]);
              return copy;
            }),
          timers[slot],
        );
      }
      scheduleId = setTimeout(tick, randomTickDelay(LISTING_TICK_RANGE_MS));
    }
    scheduleId = setTimeout(tick, randomTickDelay(LISTING_TICK_RANGE_MS));

    return () => {
      clearTimeout(scheduleId);
      for (const t of timers) {
        if (t.timeout) clearTimeout(t.timeout);
        if (t.raf1 != null) cancelAnimationFrame(t.raf1);
        if (t.raf2 != null) cancelAnimationFrame(t.raf2);
      }
    };
    // pool and the paused refs are stable for this component's whole
    // lifetime (pool fetched once server-side; refs never change identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return slots;
}

/** Same idea as useListingTrio, but for the single event tile — no
 * cross-tile duplicate concern, so it just steps through its own pool on
 * its own (slower) random schedule. */
function useSingleTile(pool: HeroPoolItem[], pausedRef: RefObject<boolean>) {
  const [state, setState] = useState<TileTransitionState>(() => ({
    current: pool[0],
    incoming: null,
    entering: false,
  }));
  const poolRef = useRef(pool);
  const indexRef = useRef(0);

  useEffect(() => {
    if (poolRef.current.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: { timeout?: ReturnType<typeof setTimeout>; raf1?: number; raf2?: number } = {};
    let scheduleId: ReturnType<typeof setTimeout>;

    function tick() {
      if (!pausedRef.current) {
        const p = poolRef.current;
        indexRef.current = (indexRef.current + 1) % p.length;
        schedulePolaroidEnter(p[indexRef.current], setState, timers);
      }
      scheduleId = setTimeout(tick, randomTickDelay(EVENT_TICK_RANGE_MS));
    }
    scheduleId = setTimeout(tick, randomTickDelay(EVENT_TICK_RANGE_MS));

    return () => {
      clearTimeout(scheduleId);
      if (timers.timeout) clearTimeout(timers.timeout);
      if (timers.raf1 != null) cancelAnimationFrame(timers.raf1);
      if (timers.raf2 != null) cancelAnimationFrame(timers.raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function HeroTileContent({ item, priority }: { item: HeroPoolItem; priority?: boolean }) {
  return (
    <>
      <Image
        src={item.src}
        alt={item.alt}
        fill
        sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 80vw"
        priority={priority}
        className="object-cover"
      />
      {item.kind && (
        <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-secondary shadow-sm">
          {item.kind === "projekt" ? "Wohnprojekt" : "Termin"}
        </span>
      )}
      {item.label && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
          <p className="truncate text-center text-sm font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.6)]">
            {item.label}
          </p>
          {item.sublabel && (
            <p className="truncate text-center text-xs text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.6)]">
              {item.sublabel}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function HeroTile({
  state,
  pausedRef,
  gridClassName,
  visualClassName,
  priority,
  overlay,
}: {
  state: TileTransitionState;
  pausedRef: RefObject<boolean>;
  gridClassName: string;
  visualClassName: string;
  priority?: boolean;
  // Rendered as a sibling inside this tile's own wrapper (not the shared
  // grid) so an absolutely-positioned badge — e.g. the "X Veranstaltungen"
  // chip — resolves its position against this specific tile's box.
  overlay?: ReactNode;
}) {
  const { current, incoming, entering } = state;

  return (
    <div
      className={`relative ${gridClassName}`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {current.href ? (
        <Link
          href={current.href}
          className="absolute inset-0 z-10 block"
          aria-label={current.label}
        />
      ) : null}
      <div className={`relative overflow-hidden rounded-3xl shadow-lg ${visualClassName}`}>
        <div className="absolute inset-0">
          <HeroTileContent item={current} priority={priority} />
        </div>
        {incoming && (
          <div
            className={`absolute inset-0 transition-all ease-out motion-reduce:hidden ${
              entering
                ? "translate-y-0 rotate-0 scale-100 opacity-100"
                : "translate-y-8 rotate-6 scale-95 opacity-0"
            }`}
            style={{ transitionDuration: `${ENTER_DURATION_MS}ms` }}
          >
            <HeroTileContent item={incoming} />
          </div>
        )}
      </div>
      {overlay}
    </div>
  );
}

/**
 * The homepage hero's bento-grid image tiles — 3 listing tiles + 1 event
 * tile, each showing a real entry (see HeroPoolItem.kind) or a curated
 * fallback mood photo when there aren't enough real ones yet (see
 * page.tsx's getHeroPools()). A client island (the rest of the homepage
 * stays a server component): the 3 listing tiles rotate as one coordinated
 * group (see useListingTrio, guaranteeing no two ever show the same
 * listing at once) and the event tile rotates independently, each pausing
 * while that specific tile is hovered.
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
  const paused0 = useRef(false);
  const paused1 = useRef(false);
  const paused2 = useRef(false);
  const pausedEvent = useRef(false);

  const listingSlots = useListingTrio(listingPool, [paused0, paused1, paused2]);
  const eventSlot = useSingleTile(eventPool, pausedEvent);

  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <HeroTile
          state={listingSlots[0]}
          pausedRef={paused0}
          gridClassName={HERO_TILE_GRID_CLASS[0]}
          visualClassName={HERO_TILE_VISUAL_CLASS[0]}
          priority
        />
        <HeroTile
          state={listingSlots[1]}
          pausedRef={paused1}
          gridClassName={HERO_TILE_GRID_CLASS[1]}
          visualClassName={HERO_TILE_VISUAL_CLASS[1]}
        />
        <HeroTile
          state={listingSlots[2]}
          pausedRef={paused2}
          gridClassName={HERO_TILE_GRID_CLASS[2]}
          visualClassName={HERO_TILE_VISUAL_CLASS[2]}
        />
        <HeroTile
          state={eventSlot}
          pausedRef={pausedEvent}
          gridClassName={HERO_TILE_GRID_CLASS[3]}
          visualClassName={HERO_TILE_VISUAL_CLASS[3]}
          overlay={
            upcomingEventsCount > 0 ? (
              <div className="absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-lg">
                <CalendarDays className="h-6 w-6 shrink-0 text-secondary" aria-hidden="true" />
                <p className="whitespace-nowrap text-sm font-medium leading-snug">
                  {upcomingEventsCount}{" "}
                  {upcomingEventsCount === 1 ? "Veranstaltung" : "Veranstaltungen"} auf LiGem
                </p>
              </div>
            ) : undefined
          }
        />
      </div>
      {publishedListingsCount > 0 && (
        <div className="absolute -top-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-lg sm:-left-6 sm:translate-x-0">
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
