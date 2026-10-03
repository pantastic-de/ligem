"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { markFavoriteNewsSeen } from "@/app/mein-konto/favoriten/actions";
import type { NewsItem } from "@/lib/favorites";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const eventDateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/**
 * News on the favorites page. Marks everything as seen once shown, which
 * also refreshes the header heart. The list is kept in state from the first
 * render, so the "Neu" markers survive the refresh that marking triggers.
 */
export function FavoriteNewsList({ items: initialItems }: { items: NewsItem[] }) {
  const [items] = useState(initialItems);

  useEffect(() => {
    if (initialItems.some((item) => item.isNew)) void markFavoriteNewsSeen();
    // Only once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-text-muted">
        Gerade gibt es nichts Neues. Sobald deine Favoriten neue Termine eintragen oder ihr Projekt aktualisieren,
        steht es hier.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-text/10">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {item.isNew ? (
              <span className="rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-white">Neu</span>
            ) : null}
            <Link href={item.href} className="font-medium text-primary hover:underline">
              {item.text}
            </Link>
            <span className="text-sm text-text-muted">{dateFormat.format(item.latest)}</span>
          </div>
          {item.events.length > 1 ? (
            <ul className="flex flex-col gap-0.5 pl-4 text-sm">
              {item.events.map((event) => (
                <li key={event.href}>
                  <Link href={event.href} className="text-primary hover:underline">
                    {event.title}
                  </Link>{" "}
                  <span className="text-text-muted">{eventDateFormat.format(event.startAt)} Uhr</span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
