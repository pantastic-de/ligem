"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

import type {
  AttributeGroup,
  AttributeOption,
  ListingCategory,
} from "@/generated/prisma/client";
import { LocationRadiusPicker } from "@/components/location-radius-picker";
import { EventDateFilter } from "@/components/event-date-filter";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { type MapResultItem } from "@/lib/map-result-item";
import {
  loadListingPopupHtml,
  SLUG_PLACEHOLDER,
  type ListingMapPoint,
} from "@/lib/listing-popup";
import { useAutoSubmitForm } from "@/lib/use-auto-submit-form";

type GroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function ProjekteSearchForm({
  categories,
  projektTyp,
  advancedGroups,
  defaults,
  anyAdvancedFilterActive,
  categoryCounts,
  attrCounts,
  mapPoints,
  mapHrefTemplate,
  selectedId,
}: {
  categories: ListingCategory[];
  projektTyp: GroupWithOptions | undefined;
  advancedGroups: GroupWithOptions[];
  defaults: {
    typId?: string;
    kategorieIds: string[];
    lat?: string;
    lng?: string;
    radius?: string;
    attrSelected: Record<string, string[]>;
    sortierung: string;
    von?: string;
    bis?: string;
    suche?: string;
  };
  anyAdvancedFilterActive: boolean;
  // Faceted result counts for every checkbox in "Erweiterte Suche" — how
  // many results selecting that specific option would produce combined with
  // every other currently active filter (see /projekte/page.tsx's
  // facetWhere). Passed straight through to each MultiSelectDropdown.
  categoryCounts: Record<string, number>;
  attrCounts: Record<string, Record<string, number>>;
  // Compact map markers plus one href template (see src/lib/listing-popup.ts);
  // full hrefs are built here, popups are loaded on click.
  mapPoints: ListingMapPoint[];
  mapHrefTemplate: string;
  // Id of the listing currently shown in the detail pane, if any — see
  // LocationRadiusPicker's selectedId prop.
  selectedId?: string;
}) {
  const { formRef, handleChange, submitNow, isPending } = useAutoSubmitForm();

  // Memoized on the server props, so the map's [resultItems] effect still
  // only rebuilds its markers when a navigation delivers new points.
  const resultItems = useMemo<MapResultItem[]>(
    () =>
      mapPoints.map((point) => ({
        id: point.id,
        label: point.label,
        sublabel: point.sublabel,
        latitude: point.latitude,
        longitude: point.longitude,
        href: mapHrefTemplate.replace(SLUG_PLACEHOLDER, encodeURIComponent(point.slug)),
      })),
    [mapPoints, mapHrefTemplate],
  );

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold">Projekte finden</h2>
        <p className="text-sm text-text-muted">
          Nach Ort, Umkreis und weiteren Merkmalen filtern.
        </p>
      </div>

      {projektTyp ? (
        // Single choice as radio chips (same look as the filter chips in
        // MultiSelectDropdown); uncontrolled, so the form's onChange
        // auto-submit picks changes up like any other input.
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">{projektTyp.name}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: "", name: "Alle" }, ...projektTyp.options].map((option) => (
              <label
                key={option.id || "alle"}
                className="inline-flex min-h-10 max-w-full cursor-pointer items-center rounded-full border border-text/15 bg-bg px-3.5 py-1 transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:checked]:shadow-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text"
              >
                <input
                  type="radio"
                  name="typ"
                  value={option.id}
                  defaultChecked={(defaults.typId ?? "") === option.id}
                  className="sr-only"
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <LocationRadiusPicker
        defaultLat={defaults.lat}
        defaultLng={defaults.lng}
        defaultRadius={defaults.radius}
        resultItems={resultItems}
        loadPopupHtml={loadListingPopupHtml}
        resultTone="projekt"
        selectedId={selectedId}
        onChange={submitNow}
      />

      {/*
        Sortierung is chosen via ProjekteSortSelect above the results list
        (see /projekte/page.tsx), not here — but it still needs to travel
        along whenever a *sidebar* filter change triggers this form's own
        auto-submit, so its current value rides along as a hidden field
        rather than being lost/reset back to the default each time.
      */}
      <input type="hidden" name="sortierung" value={defaults.sortierung} />
      {/*
        The header's global keyword search (see SiteHeader) sets `suche` via
        a plain GET navigation to /projekte — it isn't a field inside this
        form, so it needs the same hidden-field treatment as `sortierung`
        above to survive a sidebar filter change re-submitting this form.
      */}
      <input type="hidden" name="suche" value={defaults.suche ?? ""} />

      <details id="erweiterte-suche" className="group/adv" open={anyAdvancedFilterActive}>
        <summary className="flex min-h-12 list-none cursor-pointer select-none items-center gap-3 rounded-2xl bg-bg px-4 py-2 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1 font-semibold">Erweiterte Suche</span>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open/adv:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="flex flex-col gap-3 pt-3">
          <details className="group rounded-2xl border border-text/10 bg-surface shadow-sm" open={Boolean(defaults.von || defaults.bis)}>
            <summary className="flex min-h-12 list-none cursor-pointer select-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
              <span className="flex-1 font-semibold">Suchzeitraum</span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="flex flex-col gap-4 border-t border-text/10 p-3">
              <EventDateFilter
                defaultVon={defaults.von}
                defaultBis={defaults.bis}
                onChange={submitNow}
                placeholder="Suchzeitraum wählen"
                emptyHint="Kein bestimmter Suchzeitraum, zum Eingrenzen einen Beginn-Tag anklicken."
                embedded
              />
            </div>
          </details>

          {categories.length > 0 ? (
            <MultiSelectDropdown
              label="Art des Projektinserates"
              name="kategorie"
              options={categories}
              defaultSelected={defaults.kategorieIds}
              counts={categoryCounts}
              onChange={submitNow}
            />
          ) : null}

          {advancedGroups.map((group) => (
            <MultiSelectDropdown
              key={group.id}
              label={group.name}
              name={`attr-${group.slug}`}
              options={group.options}
              defaultSelected={defaults.attrSelected[group.slug] ?? []}
              counts={attrCounts[group.slug]}
              onChange={submitNow}
            />
          ))}
        </div>
      </details>

      <p aria-live="polite" className="text-sm text-text-muted">
        {isPending ? "Ergebnisse werden aktualisiert…" : ""}
      </p>
    </form>
  );
}
