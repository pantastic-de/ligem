"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Sort-order select shown above the results list (next to the result count),
 * not inside the sidebar filter form — it changes only the `sortierung`
 * query param, preserving every other currently active filter, via its own
 * router.replace rather than participating in ProjekteSearchForm's auto-
 * submit. See ProjekteSearchForm's hidden `sortierung` input for how the
 * current value still survives when a *sidebar* filter changes instead.
 */
export function ProjekteSortSelect({
  value,
  originSet,
}: {
  value: string;
  originSet: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortierung", e.target.value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sortierung" className="font-medium text-text-muted">
        Sortierung
      </label>
      <select
        id="sortierung"
        value={value}
        onChange={handleChange}
        className="min-h-9 rounded-xl border border-text/20 bg-bg px-3 text-sm text-text"
      >
        <option value="neueste">Neueste zuerst</option>
        {originSet ? <option value="entfernung">Entfernung</option> : null}
        <option value="name">Name</option>
        <option value="kosten">Monatliche Kosten</option>
      </select>
    </div>
  );
}
