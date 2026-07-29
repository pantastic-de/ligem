"use client";

import type {
  AttributeGroup,
  AttributeOption,
  ListingCategory,
} from "@/generated/prisma/client";
import { LocationRadiusPicker } from "@/components/location-radius-picker";
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
  };
  anyAdvancedFilterActive: boolean;
  resultItems: MapResultItem[];
}) {
  const { formRef, handleChange, submitNow, isPending } = useAutoSubmitForm();

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => e.preventDefault()}
      className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm"
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
        onChange={submitNow}
      />

      <details className="rounded-xl border border-text/20" open={anyAdvancedFilterActive}>
        <summary className="cursor-pointer select-none px-4 py-3 font-medium">
          Erweiterte Suche
        </summary>
        <div className="flex flex-col gap-6 border-t border-text/10 p-4">
          {categories.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">Art des Projektinserates</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      name="kategorie"
                      value={category.id}
                      defaultChecked={defaults.kategorieIds.includes(category.id)}
                      className="h-5 w-5"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {advancedGroups.map((group) => {
            const selected = defaults.attrSelected[group.slug] ?? [];
            return (
              <fieldset key={group.id} className="flex flex-col gap-2">
                <legend className="font-medium">{group.name}</legend>
                {group.allowMultiple ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.options.map((option) => (
                      <label key={option.id} className="flex min-h-11 items-center gap-2">
                        <input
                          type="checkbox"
                          name={`attr-${group.slug}`}
                          value={option.id}
                          defaultChecked={selected.includes(option.id)}
                          className="h-5 w-5"
                        />
                        {option.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <select
                    name={`attr-${group.slug}`}
                    defaultValue={selected[0] ?? ""}
                    className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
                  >
                    <option value="">Alle</option>
                    {group.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                )}
              </fieldset>
            );
          })}
        </div>
      </details>

      <p aria-live="polite" className="text-sm text-text-muted">
        {isPending ? "Ergebnisse werden aktualisiert…" : ""}
      </p>
    </form>
  );
}
