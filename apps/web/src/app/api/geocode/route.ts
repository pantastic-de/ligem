import { NextResponse } from "next/server";

// Thin server-side proxy to OpenStreetMap's Nominatim geocoder. Kept
// server-side so we can set a proper identifying User-Agent (required by
// Nominatim's usage policy) and so the client never talks to a third-party
// host directly. Supports either a free-text query (`q`, used for "search a
// place" pickers) or structured params (used for full-address geocoding and
// for postal-code -> country/state lookups).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("limit", "5");

  const q = searchParams.get("q");
  const postalcode = searchParams.get("postalcode");
  const country = searchParams.get("country");
  const city = searchParams.get("city");
  const street = searchParams.get("street");

  if (q) {
    nominatimUrl.searchParams.set("q", q);
  } else if (postalcode || city || street) {
    if (street) nominatimUrl.searchParams.set("street", street);
    if (postalcode) nominatimUrl.searchParams.set("postalcode", postalcode);
    if (city) nominatimUrl.searchParams.set("city", city);
    if (country) nominatimUrl.searchParams.set("country", country);
  } else {
    return NextResponse.json([]);
  }

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "LiGem/1.0 (https://ligem.de; info@ligem.de)",
      "Accept-Language": "de",
    },
  });

  if (!response.ok) {
    return NextResponse.json([], { status: 502 });
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }>;

  return NextResponse.json(
    data.map((entry) => ({
      lat: entry.lat,
      lon: entry.lon,
      displayName: entry.display_name,
      country: entry.address?.country,
      state: entry.address?.state,
      postalCode: entry.address?.postcode,
      city:
        entry.address?.city ?? entry.address?.town ?? entry.address?.village,
    })),
  );
}
