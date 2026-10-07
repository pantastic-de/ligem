import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Hint above the contact and event-interest forms, shown only to anonymous
 * visitors: without a LiGem account there is no confirmation mail, so they
 * have to remember the request themselves, and the project sees their typed
 * address as unchecked. Logged-in users just get the pre-filled fields.
 */
export function SenderConfirmationHint({ kind, loggedIn }: { kind: "kontakt" | "termin"; loggedIn: boolean }) {
  if (loggedIn) return null;
  const remember = kind === "termin" ? "wo du dich gemeldet hast" : "wem du geschrieben hast";
  return (
    <p className="flex items-start gap-2 rounded-xl bg-surface/80 px-3 py-2 text-sm text-text-muted">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Ohne LiGem-Konto bekommst du keine Bestätigung per E-Mail. Bitte merk dir selbst, {remember}. Deine Adresse geht
        als nicht überprüft an {kind === "termin" ? "den Veranstalter" : "das Projekt"}. Mit einem bestätigten{" "}
        <Link href="/registrieren" className="text-primary hover:underline">
          LiGem-Konto
        </Link>{" "}
        bekommst du eine Bestätigung.
      </span>
    </p>
  );
}
