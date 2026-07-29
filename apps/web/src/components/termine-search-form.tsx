"use client";

import type { AttributeGroup, AttributeOption } from "@/generated/prisma/client";
import { EventDateFilter } from "@/components/event-date-filter";
import { LocationRadiusPicker } from "@/components/location-radius-picker";
import { type MapResultItem } from "@/lib/map-result-item";
import { useAutoSubmitForm } from "@/lib/use-auto-submit-form";

type GroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function TermineSearchForm({
  veranstaltungsart,
  zielgruppe,
  defaults,
  resultItems,
}: {
  veranstaltungsart: GroupWithOptions | null;
  zielgruppe: GroupWithOptions | null;
  defaults: {
    art?: string;
    zielgruppeIds: string[];
    lat?: string;
    lng?: string;
    radius?: string;
    von?: string;
    bis?: string;
  };
  resultItems: MapResultItem[];
}) {
  const { formRef, handleChange, submitNow, isPending } = useAutoSubmitForm();

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => e.preventDefault()}
      className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
    >
      {veranstaltungsart ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="art" className="font-medium">
            Veranstaltungsart
          </label>
          <select
            id="art"
            name="art"
            defaultValue={defaults.art ?? ""}
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          >
            <option value="">Alle</option>
            {veranstaltungsart.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {zielgruppe ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Zielgruppe</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {zielgruppe.options.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  name="zielgruppe"
                  value={option.id}
                  defaultChecked={defaults.zielgruppeIds.includes(option.id)}
                  className="h-5 w-5"
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <EventDateFilter
        defaultVon={defaults.von}
        defaultBis={defaults.bis}
        onChange={submitNow}
      />

      <LocationRadiusPicker
        defaultLat={defaults.lat}
        defaultLng={defaults.lng}
        defaultRadius={defaults.radius}
        resultItems={resultItems}
        onChange={submitNow}
      />

      <p aria-live="polite" className="text-sm text-text-muted">
        {isPending ? "Ergebnisse werden aktualisiert…" : ""}
      </p>
    </form>
  );
}
