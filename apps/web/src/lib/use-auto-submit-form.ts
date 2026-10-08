"use client";

import { useCallback, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const DEBOUNCE_MS = 300;

// Powers "no submit button needed" search-filter forms: reads the current
// values straight out of the DOM (native inputs via their own change events,
// custom widgets via an explicit onChange callback) and pushes them into the
// URL as search params via router.replace, so the server component page
// re-fetches and re-renders without a full page reload.
//
// `listPath` is the result list the form belongs to (/projekte, /termine).
// The same sidebar also sits on the detail pages (/projekt/<slug>,
// /event/<slug>); a filter change there means "search again", so it goes to
// the list with the new filters instead of keeping the detail open. That
// step is a push, so the browser's Back button returns to the detail.
export function useAutoSubmitForm(listPath?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitNow = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const str = value.toString();
      if (str) params.append(key, str);
    }
    const qs = params.toString();
    const target = listPath ?? pathname;
    const href = qs ? `${target}?${qs}` : target;
    startTransition(() => {
      if (target === pathname) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }, [listPath, pathname, router]);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(submitNow, DEBOUNCE_MS);
  }, [submitNow]);

  return { formRef, handleChange, submitNow, isPending };
}
