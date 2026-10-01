/**
 * An event's postal address as one line, e.g. "Waldrandstraße 138 · 50667 Köln".
 * Shared by the event detail view and its .ics download so both read the
 * same. Returns null when no street, postal code or city is set.
 */
export function formatEventAddress(event: {
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
}): string | null {
  const street = [event.street, event.houseNumber].filter(Boolean).join(" ");
  const place = [event.postalCode, event.city].filter(Boolean).join(" ");
  return [street, place].filter(Boolean).join(" · ") || null;
}
