"use client";

import { useState } from "react";

import { EventDateFilter } from "@/components/event-date-filter";

/**
 * "Temporäres Angebot" checkbox in the listing form. Only while it is checked
 * a von/bis calendar appears (the same range calendar as the search filters,
 * without the quick picks), submitted as temporaryFrom/temporaryUntil.
 * Unchecking hides it and the server clears the dates.
 */
export function TemporaryOfferField({
  defaultChecked,
  defaultFrom,
  defaultUntil,
}: {
  defaultChecked?: boolean;
  defaultFrom?: string;
  defaultUntil?: string;
}) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isTemporary"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-5 w-5"
        />
        Temporäres Angebot (z. B. Probewohnen, Retreat, Zwischennutzung)
      </label>
      {checked ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-text/10 bg-surface p-4 shadow-sm">
          <p className="font-medium">Zeitraum des Angebots</p>
          <EventDateFilter
            defaultVon={defaultFrom}
            defaultBis={defaultUntil}
            startName="temporaryFrom"
            endName="temporaryUntil"
            showPresets={false}
            placeholder="Kein Zeitraum gewählt"
            emptyHint="Ersten Tag anklicken, dann den letzten. Ohne Enddatum gilt das Angebot ab dem ersten Tag."
            embedded
          />
        </div>
      ) : null}
    </div>
  );
}
