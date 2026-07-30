"use client";

// Convenience checkbox helpers for the /admin/projekte, /admin/termine and
// /admin/nutzer bulk-actions forms. The checkboxes themselves live inside
// each row's <li> and are associated with the outer bulk form via the
// `form` attribute (so they don't need to be DOM descendants of it — a
// literal nested <form> would be invalid HTML, since each row already has
// its own single-item action forms). These buttons just flip `.checked`
// directly on the matching checkboxes; no form state needed since the
// checkboxes are uncontrolled. Selecting purely by `form="<formId>"` (not
// also by a fixed `name`) is what makes this component reusable across all
// three pages, whose checkboxes are named "listingIds"/"eventIds"/
// "userIds" respectively.
export function BulkSelectControls({ formId }: { formId: string }) {
  function setChecked(checked: boolean, onlyDemo: boolean) {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][form="${formId}"]`,
    );
    checkboxes.forEach((checkbox) => {
      // Disabled checkboxes (e.g. /admin/nutzer's row for your own account)
      // are already excluded from submission by the browser regardless of
      // `.checked` — skipping them here too just avoids the visual
      // inconsistency of a disabled row looking selected.
      if (checkbox.disabled) return;
      if (onlyDemo && checkbox.dataset.demo !== "true") return;
      checkbox.checked = checked;
    });
  }

  const linkClass = "text-sm font-medium text-primary hover:underline";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <button type="button" onClick={() => setChecked(true, false)} className={linkClass}>
        Alle auswählen
      </button>
      <button type="button" onClick={() => setChecked(true, true)} className={linkClass}>
        Nur generierte auswählen
      </button>
      <button type="button" onClick={() => setChecked(false, false)} className={linkClass}>
        Auswahl aufheben
      </button>
    </div>
  );
}
