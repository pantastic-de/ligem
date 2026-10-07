import type { CSSProperties } from "react";

/**
 * A number that counts up from 0 when the page appears (CSS-only, see
 * .ligem-count-up in globals.css). The real, formatted value is in the
 * markup for screen readers, search engines and copy/paste; the animated
 * digits are decorative. The counter has no thousands separator, so the
 * visible number reads "1030" rather than "1.030".
 */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{new Intl.NumberFormat("de-DE").format(value)}</span>
      <span
        aria-hidden="true"
        className="ligem-count-up tabular-nums"
        style={{ "--count-target": value } as CSSProperties}
      />
    </span>
  );
}
