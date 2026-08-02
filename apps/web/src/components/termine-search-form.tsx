"use client";

import type { AttributeGroup, AttributeOption } from "@/generated/prisma/client";
import { EventDateFilter } from "@/components/event-date-filter";
import { LocationRadiusPicker } from "@/components/location-radius-picker";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { type MapResultItem } from "@/lib/map-result-item";
import { useAutoSubmitForm } from "@/lib/use-auto-submit-form";
import { colorForCategory } from "@/lib/category-color";

type GroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function TermineSearchForm({
  veranstaltungsart,
  zielgruppe,
  defaults,
  resultItems,
  eventDayColors,
  selectedId,
}: {
  veranstaltungsart: GroupWithOptions | null;
  zielgruppe: GroupWithOptions | null;
  defaults: {
    artIds: string[];
    zielgruppeIds: string[];
    lat?: string;
    lng?: string;
    radius?: string;
    von?: string;
    bis?: string;
  };
  resultItems: MapResultItem[];
  // Date (YYYY-MM-DD) -> distinct event-type colors found on that day, for
  // the calendar's small day-cell dots.
  eventDayColors: Record<string, string[]>;
  // Id of the event currently shown in the detail pane, if any — see
  // LocationRadiusPicker's selectedId prop.
  selectedId?: string;
}) {
  const { formRef, handleChange, submitNow, isPending } = useAutoSubmitForm();
  const legend =
    veranstaltungsart?.options.map((option) => ({
      name: option.name,
      color: colorForCategory(option.id),
    })) ?? [];

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
    >
      <EventDateFilter
        defaultVon={defaults.von}
        defaultBis={defaults.bis}
        onChange={submitNow}
        eventDayColors={eventDayColors}
        legend={legend}
      />

      {veranstaltungsart ? (
        <MultiSelectDropdown
          label="Veranstaltungsart"
          name="art"
          options={veranstaltungsart.options}
          defaultSelected={defaults.artIds}
        />
      ) : null}

      {zielgruppe ? (
        <MultiSelectDropdown
          label="Zielgruppe"
          name="zielgruppe"
          options={zielgruppe.options}
          defaultSelected={defaults.zielgruppeIds}
        />
      ) : null}

      <LocationRadiusPicker
        defaultLat={defaults.lat}
        defaultLng={defaults.lng}
        defaultRadius={defaults.radius}
        resultItems={resultItems}
        selectedId={selectedId}
        onChange={submitNow}
      />

      <p aria-live="polite" className="text-sm text-text-muted">
        {isPending ? "Ergebnisse werden aktualisiert…" : ""}
      </p>
    </form>
  );
}
