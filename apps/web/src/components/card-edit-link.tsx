import Link from "next/link";
import { Pencil } from "lucide-react";

/** Round pencil next to the heart on a result card; only rendered for people allowed to edit. */
export function CardEditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/95 text-text-muted shadow-sm ring-1 ring-text/10 transition-transform hover:scale-110 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
