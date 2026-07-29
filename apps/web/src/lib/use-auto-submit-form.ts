"use client";

import { useCallback, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const DEBOUNCE_MS = 300;

// Powers "no submit button needed" search-filter forms: reads the current
// values straight out of the DOM (native inputs via their own change events,
// custom widgets via an explicit onChange callback) and pushes them into the
// URL as search params via router.replace, so the server component page
// re-fetches and re-renders without a full page reload.
export function useAutoSubmitForm() {
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
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [pathname, router]);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(submitNow, DEBOUNCE_MS);
  }, [submitNow]);

  return { formRef, handleChange, submitNow, isPending };
}
