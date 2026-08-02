"use client";

import type {
  AttributeGroup,
  AttributeOption,
  ListingCategory,
} from "@/generated/prisma/client";
import { LocationRadiusPicker } from "@/components/location-radius-picker";
import { EventDateFilter } from "@/components/event-date-filter";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { type MapResultItem } from "@/lib/map-result-item";
import { useAutoSubmitForm } from "@/lib/use-auto-submit-form";

type GroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function ProjekteSearchForm({
  categories,
  projektTyp,
  advancedGroups,
  defaults,
  anyAdvancedFilterActive,
  resultItems,
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
  resultItems: MapResultItem[];
  // Id of the listing currently shown in the detail pane, if any — see
  // LocationRadiusPicker's selectedId prop.
  selectedId?: string;
}) {
  const { formRef, handleChange, submitNow, isPending } = useAutoSubmitForm();

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
    >
      {projektTyp ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="typ" className="font-medium">
            {projektTyp.name}
          </label>
          <select
            id="typ"
            name="typ"
            defaultValue={defaults.typId ?? ""}
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          >
            <option value="">Alle</option>
            {projektTyp.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <LocationRadiusPicker
        defaultLat={defaults.lat}
        defaultLng={defaults.lng}
        defaultRadius={defaults.radius}
        resultItems={resultItems}
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

      <details className="rounded-xl border border-text/20" open={anyAdvancedFilterActive}>
        <summary className="cursor-pointer select-none px-4 py-3 font-medium">
          Erweiterte Suche
        </summary>
        <div className="flex flex-col gap-6 border-t border-text/10 p-4">
          {categories.length > 0 ? (
            <MultiSelectDropdown
              label="Art des Projektinserates"
              name="kategorie"
              options={categories}
              defaultSelected={defaults.kategorieIds}
            />
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Suchzeitraum</legend>
            <EventDateFilter
              defaultVon={defaults.von}
              defaultBis={defaults.bis}
              onChange={submitNow}
              placeholder="Suchzeitraum wählen"
              emptyHint="Kein bestimmter Suchzeitraum — zum Eingrenzen einen Beginn-Tag anklicken."
            />
          </fieldset>

          {advancedGroups.map((group) => (
            <MultiSelectDropdown
              key={group.id}
              label={group.name}
              name={`attr-${group.slug}`}
              options={group.options}
              defaultSelected={defaults.attrSelected[group.slug] ?? []}
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
