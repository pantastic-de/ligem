"use client";

import { useState } from "react";

type Option = { id: string; name: string };

/**
 * An option group collapsed behind a native <details>/<summary> disclosure
 * — click the summary row to expand and reveal the checkboxes/radios,
 * matching the outer "Erweiterte Suche" <details> one level up in both
 * search forms. Used for every attribute-group field in ProjekteSearchForm/
 * TermineSearchForm (always `multiple`, regardless of the underlying
 * AttributeGroup's own `allowMultiple` flag — a *search* filter benefits
 * from OR-matching several values even for a group where each individual
 * listing/event only ever holds one) and in ListingFormFields/
 * EventFormFields (there, `multiple` is passed through from `allowMultiple`,
 * since assigning attributes to a single listing/event should still
 * respect that group's real single-vs-multi-value semantics — only the
 * collapsed-dropdown *presentation* is shared, not the selection rule).
 *
 * The inputs are plain <input type="checkbox"|"radio" name=... value=...>
 * elements, so the surrounding <form>'s native onChange bubbling (see
 * useAutoSubmitForm, where used) picks up changes exactly like any other
 * checkbox/radio in these forms — no onChange prop needed here. Selection
 * is tracked in local state (rather than defaultChecked) purely so the
 * summary text updates immediately on click, before any debounced
 * auto-submit/page re-render catches up.
 */
export function MultiSelectDropdown({
  label,
  name,
  options,
  defaultSelected,
  multiple = true,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultSelected: string[];
  // false renders radios (single choice) instead of checkboxes — used by
  // ListingFormFields/EventFormFields for groups where allowMultiple is
  // false, so assigning attributes to a listing/event still enforces
  // "only one value from this group" even though the field now looks like
  // every other collapsed dropdown.
  multiple?: boolean;
}) {
  const [selected, setSelected] = useState(() => new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((prev) => {
      if (!multiple) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const summaryText = multiple
    ? selected.size > 0
      ? `${selected.size} ausgewählt`
      : null
    : (options.find((o) => selected.has(o.id))?.name ?? null);

  return (
    <details className="rounded-xl border border-text/20">
      <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 px-4 py-2 font-medium">
        <span>{label}</span>
        {summaryText ? (
          <span className="truncate text-sm font-normal text-text-muted">{summaryText}</span>
        ) : null}
      </summary>
      <div className="grid grid-cols-1 gap-2 border-t border-text/10 p-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option.id}
              checked={selected.has(option.id)}
              onChange={() => toggle(option.id)}
              className="h-5 w-5"
            />
            {option.name}
          </label>
        ))}
      </div>
    </details>
  );
}
