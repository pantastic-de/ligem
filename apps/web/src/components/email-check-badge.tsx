import { ShieldCheck, ShieldQuestion } from "lucide-react";

/** Next to a sender's address in organizer lists: confirmed via a LiGem account or unchecked. */
export function EmailCheckBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span
      title="Über ein bestätigtes LiGem-Konto nachgewiesen"
      className="inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2 py-0.5 text-xs font-semibold text-secondary"
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      E-Mail bestätigt
    </span>
  ) : (
    <span
      title="Ohne bestätigtes LiGem-Konto angegeben, nicht überprüft"
      className="inline-flex items-center gap-1 rounded-full bg-text/8 px-2 py-0.5 text-xs font-semibold text-text-muted"
    >
      <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
      E-Mail nicht überprüft
    </span>
  );
}
