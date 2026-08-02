// Server-side geocoding for the KI-Import pipeline (src/lib/homepage-import.ts)
// — every other geocoding path in this app runs client-side against
// /api/geocode (see CLAUDE.md), but the import pipeline has no browser
// round-trip to do that from, so this duplicates that route's Nominatim
// call directly rather than the client fetching its own address through it.
export async function geocodeAddress(address: {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const street = [address.street, address.houseNumber].filter(Boolean).join(" ");
  if (!street && !address.postalCode && !address.city) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  if (street) url.searchParams.set("street", street);
  if (address.postalCode) url.searchParams.set("postalcode", address.postalCode);
  if (address.city) url.searchParams.set("city", address.city);
  if (address.country) url.searchParams.set("country", address.country);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LiGem/1.0 (https://ligem.de; info@ligem.de)",
        "Accept-Language": "de",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { lat: string; lon: string }[];
    const first = data[0];
    if (!first) return null;
    return { latitude: Number.parseFloat(first.lat), longitude: Number.parseFloat(first.lon) };
  } catch {
    return null;
  }
}
