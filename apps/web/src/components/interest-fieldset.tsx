import { INTEREST_OPTIONS } from "@/lib/user-roles";

/**
 * "Ich möchte (optional):" checkboxes, on /registrieren and /mein-konto.
 * Submitted as repeated `interest` values (see interestRolesFromForm).
 */
export function InterestFieldset({
  selected = [],
  legend = "Ich möchte (optional):",
  hint,
}: {
  selected?: readonly string[];
  legend?: string;
  hint?: string;
}) {
  const chosen = new Set(selected);
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-medium">{legend}</legend>
      {hint ? <p className="mb-1 text-sm text-text-muted">{hint}</p> : null}
      {INTEREST_OPTIONS.map((option) => (
        <label key={option.role} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="interest"
            value={option.role}
            defaultChecked={chosen.has(option.role)}
            className="h-5 w-5 shrink-0"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
