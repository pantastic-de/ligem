"use client";

import { useState, type MouseEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";

type Option = { id: string; name: string };

/**
 * An option group collapsed behind a native <details>/<summary> disclosure
 * — click the summary row to expand and reveal the options as toggle chips
 * (each a visually hidden checkbox/radio inside its <label>, so forms,
 * keyboard and screen readers work exactly like plain inputs; chips wrap
 * cleanly in the narrow search sidebar where a two-column checkbox grid
 * overflowed),
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
  colors,
  onChange,
  tone = "projekt",
}: {
  // Color of the chosen chips: Projekte orange-red, Termine green.
  tone?: "projekt" | "termin";
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
  // Optional color per option id, shown as a dot on its chip — e.g. the
  // Veranstaltungsart colors that also mark days in the /termine calendar.
  colors?: Record<string, string>;
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

  // Names of the chosen options, so the collapsed row says what is active
  // ("Workshop, Besuchstag") instead of only how many.
  const selectedNames = options.filter((o) => selected.has(o.id)).map((o) => o.name);
  const summaryText =
    selectedNames.length === 0
      ? null
      : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`;

  return (
    <details className="group rounded-2xl border border-text/10 bg-surface shadow-sm">
      <summary className="flex min-h-12 list-none cursor-pointer select-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{label}</span>
          {summaryText ? (
            <span className={`block truncate text-sm ${tone === "termin" ? "text-secondary" : "text-primary"}`}>{summaryText}</span>
          ) : null}
        </span>
        {summaryText ? (
          <button
            type="button"
            onClick={clearAll}
            aria-label={`${label}: Auswahl zurücksetzen`}
            title="Auswahl zurücksetzen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <ChevronDown
          className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-wrap gap-2 border-t border-text/10 p-3">
        {options.map((option) => {
          const count = counts?.[option.id];
          const isZero = count === 0;
          const checked = selected.has(option.id);
          const color = colors?.[option.id];
          return (
            <label
              key={option.id}
              className={[
                "inline-flex min-h-10 max-w-full cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1 text-left transition-colors",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text",
                checked
                  ? tone === "termin"
                    ? "border-secondary bg-secondary text-white shadow-sm"
                    : "border-primary bg-primary text-white shadow-sm"
                  : `border-text/15 bg-bg ${tone === "termin" ? "hover:border-secondary/50" : "hover:border-primary/50"} ${isZero ? "text-text-muted/60" : ""}`,
              ].join(" ")}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => toggle(option.id)}
                className="sr-only"
              />
              {checked ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : color ? (
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${isZero ? "opacity-50" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ) : null}
              <span className="min-w-0 break-words">{option.name}</span>
              {count != null ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                    checked ? "bg-white/25 text-white" : "bg-text/8 text-text-muted"
                  }`}
                  aria-label={`${count} Treffer`}
                >
                  {count}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </details>
  );
}
