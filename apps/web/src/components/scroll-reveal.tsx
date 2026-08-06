"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Small, dependency-free "fade + rise into view on scroll" wrapper used on
// the homepage to give it a livelier, more modern feel than a plain static
// page. Uses IntersectionObserver (not a scroll listener) so it costs
// nothing until the section is actually near the viewport, and disconnects
// itself once revealed instead of continuing to observe. `motion-reduce:`
// (Tailwind's `prefers-reduced-motion: reduce` variant) drops the
// transform/opacity entirely per the accessibility checklist in
// warm-community-design — content is never gated behind motion finishing.
export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
