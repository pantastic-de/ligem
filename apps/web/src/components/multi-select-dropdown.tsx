"use client";

import { useState, type MouseEvent } from "react";

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
  counts,
  onChange,
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
  // Faceted result count per option id — shown as "(N)" after the option's
  // name, and grayed out at 0, so a search filter (the only context this is
  // passed from — entry forms like ListingFormFields never pass it) shows
  // how many results each still-unchecked option would actually produce
  // combined with the rest of the currently active filters, not just its
  // raw overall total.
  counts?: Record<string, number>;
  // Called after the "✕" clear-selection button resets this group back to
  // empty — needed because that reset happens via setSelected (a plain
  // React state update), which doesn't fire a native change event on any
  // checkbox/radio, so the surrounding search form's onChange-bubbling
  // auto-submit (see useAutoSubmitForm) would otherwise never notice the
  // group was cleared. Not passed by entry forms (ListingFormFields/
  // EventFormFields), which have no auto-submit to trigger.
  onChange?: () => void;
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

  // Stops the click from also toggling the surrounding <details> open/
  // closed (its default behavior for any click landing on the <summary>)
  // — this button needs to just clear the selection, not also flip the
  // disclosure.
  function clearAll(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(new Set());
    onChange?.();
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
          <span className="relative mr-2 inline-flex max-w-[65%] items-center rounded-full bg-bg px-2 py-0.5 text-sm font-normal text-text-muted">
            <span className="mr-[5px] truncate">{summaryText}</span>
            <button
              type="button"
              onClick={clearAll}
              aria-label={`${label}: Auswahl zurücksetzen`}
              title="Auswahl zurücksetzen"
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-text/60 text-[9px] leading-none text-white shadow-sm transition-colors hover:bg-text"
            >
              ✕
            </button>
          </span>
        ) : null}
      </summary>
      <div className="grid grid-cols-1 gap-2 border-t border-text/10 p-3 sm:grid-cols-2">
        {options.map((option) => {
          const count = counts?.[option.id];
          const isZero = count === 0;
          return (
            <label
              key={option.id}
              className={`flex min-h-11 items-center gap-2 text-sm ${isZero ? "text-text-muted/40" : ""}`}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={option.id}
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
                className={`h-5 w-5 ${isZero ? "opacity-40" : ""}`}
              />
              {option.name}
              {count != null ? ` (${count})` : ""}
            </label>
          );
        })}
      </div>
    </details>
  );
}
