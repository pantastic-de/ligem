// One project's choice when an account is deleted: hand it to a co-manager,
// to another registered person, or delete it. Field names are read by
// parseListingDecisions (src/lib/account-deletion.ts). Used on
// /mein-konto/konto-loeschen and /admin/nutzer/[id].

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "wird geprüft",
  PUBLISHED: "veröffentlicht",
  REJECTED: "abgelehnt",
  ARCHIVED: "archiviert",
};

export function ListingDecisionFieldset({
  listing,
}: {
  listing: {
    id: string;
    projectName: string;
    status: string;
    _count: { events: number };
    managers: { user: { id: string; name: string | null; email: string } }[];
  };
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-semibold">
        {listing.projectName}{" "}
        <span className="text-sm font-normal text-text-muted">
          ({statusLabels[listing.status] ?? listing.status}, {listing._count.events} Termin(e))
        </span>
      </legend>
      {listing.managers.map(({ user: manager }) => (
        <label key={manager.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="radio" name={`listing-${listing.id}`} value={`manager:${manager.id}`} required className="h-5 w-5" />
          An Mitverwalter:in {manager.name ?? manager.email} übertragen
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="radio" name={`listing-${listing.id}`} value="email" required className="h-5 w-5" />
          An eine andere Person übertragen:
        </label>
        <label htmlFor={`email-${listing.id}`} className="sr-only">
          E-Mail-Adresse der neuen Inhaberin bzw. des neuen Inhabers
        </label>
        <input
          id={`email-${listing.id}`}
          name={`email-${listing.id}`}
          type="email"
          placeholder="E-Mail-Adresse ihres LiGem-Kontos"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-text/20 bg-bg px-3"
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-error">
        <input type="radio" name={`listing-${listing.id}`} value="delete" required className="h-5 w-5" />
        Projekt mit allen Terminen löschen
      </label>
    </fieldset>
  );
}
