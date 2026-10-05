import { Loader2 } from "lucide-react";

/**
 * Shown by the list routes' loading.tsx the moment someone navigates to
 * /projekte or /termine (e.g. from the homepage buttons), until the server
 * has the results ready. Mirrors the page's own layout (title, sidebar,
 * result cards) so nothing jumps when the real page replaces it.
 *
 * A direct page load streams this first too (it's the route's Suspense
 * fallback), so it is at least a screen tall: otherwise the footer showed up
 * right under the six placeholder cards and jumped down when the real list
 * arrived (measured CLS 0.11 on desktop). The column split matches the real
 * page (lg, not sm) for the same reason.
 */
export function ResultsLoading({ title, intro, label }: { title: string; intro: string; label: string }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-text-muted sm:text-lg">{intro}</p>
      </div>
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div aria-hidden="true" className="h-72 rounded-2xl bg-surface shadow-sm lg:h-[520px] lg:w-[380px] lg:shrink-0" />
        <div className="min-w-0 flex-1">
          <p role="status" aria-live="polite" className="mb-4 flex items-center gap-3 font-semibold text-primary">
            <Loader2 className="h-6 w-6 motion-safe:animate-spin" aria-hidden="true" />
            {label}
          </p>
          <ul aria-hidden="true" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex h-44 overflow-hidden rounded-2xl bg-surface shadow-sm">
                <div className="w-52 shrink-0 bg-text/5 motion-safe:animate-pulse sm:w-60" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="h-5 w-2/3 rounded bg-text/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-text/5 motion-safe:animate-pulse" />
                  <div className="h-4 w-1/3 rounded bg-text/5 motion-safe:animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
