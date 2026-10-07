"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";

/**
 * Sort order and "Nur Favoriten" above the /termine results, next to the
 * result count. Like ProjekteSortSelect it only changes its own query params
 * (sortierung, favoriten) via router.replace, keeping every other filter;
 * TermineSearchForm carries both along as hidden fields when a sidebar
 * filter changes. "Nur Favoriten" only appears for logged-in visitors.
 */
export function TermineSortSelect({
  value,
  originSet,
  favoritesOnly,
  loggedIn,
}: {
  value: string;
  originSet: boolean;
  favoritesOnly: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(key, next);
    else params.delete(key);
    params.delete("anzahl");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {loggedIn ? (
        <div className="flex rounded-full bg-bg p-1" role="group" aria-label="Welche Termine">
          {[
            { id: "", label: "Alle" },
            { id: "1", label: "Nur Favoriten" },
          ].map((o) => {
            const active = (o.id === "1") === favoritesOnly;
            return (
              <button
                key={o.label}
                type="button"
                aria-pressed={active}
                onClick={() => update("favoriten", o.id || null)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-semibold transition-colors ${
                  active ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text"
                }`}
              >
                {o.id ? <Heart className={`h-4 w-4 ${active ? "fill-white" : ""}`} aria-hidden="true" /> : null}
                {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <label htmlFor="sortierung" className="font-medium text-text-muted">
          Sortierung
        </label>
        <select
          id="sortierung"
          value={value}
          onChange={(e) => update("sortierung", e.target.value === "datum" ? null : e.target.value)}
          className="min-h-9 rounded-xl border border-text/20 bg-bg px-3 text-sm text-text"
        >
          <option value="datum">Nach Datum</option>
          <option value="neueste">Zuletzt eingetragen</option>
          {originSet ? <option value="entfernung">Nach Entfernung</option> : null}
        </select>
      </div>
    </div>
  );
}
