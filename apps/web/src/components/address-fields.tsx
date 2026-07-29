"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

type GeocodeResult = {
  lat: string;
  lon: string;
  displayName: string;
  country?: string;
  state?: string;
  postalCode?: string;
  city?: string;
};

export type AddressFieldsDefaults = {
  country?: string;
  state?: string;
  postalCode?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  regionDescription?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function AddressFields({
  defaults = {},
  showRegionDescription = false,
}: {
  defaults?: AddressFieldsDefaults;
  showRegionDescription?: boolean;
}) {
  const [country, setCountry] = useState(defaults.country ?? "");
  const [state, setState] = useState(defaults.state ?? "");
  const [postalCode, setPostalCode] = useState(defaults.postalCode ?? "");
  const [city, setCity] = useState(defaults.city ?? "");
  const [street, setStreet] = useState(defaults.street ?? "");
  const [houseNumber, setHouseNumber] = useState(defaults.houseNumber ?? "");
  const [lat, setLat] = useState<number | null>(defaults.latitude ?? null);
  const [lng, setLng] = useState<number | null>(defaults.longitude ?? null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet types don't cover the dynamic import shape cleanly
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const startLat = lat ?? 51.1657;
      const startLng = lng ?? 10.4515;
      const map = L.map(mapRef.current).setView(
        [startLat, startLng],
        lat != null ? 13 : 5,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const marker = L.circleMarker([startLat, startLng], {
        radius: 9,
        color: "#b14f24",
        fillColor: "#b14f24",
        fillOpacity: 0.85,
      });
      if (lat != null && lng != null) marker.addTo(map);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        if (!map.hasLayer(marker)) marker.addTo(map);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
        setStatusMessage("Standort manuell gesetzt.");
      });

      mapInstance.current = map;
      markerRef.current = marker;
    });
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveMapTo(newLat: number, newLng: number, zoom = 14) {
    setLat(newLat);
    setLng(newLng);
    if (mapInstance.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      if (!mapInstance.current.hasLayer(markerRef.current)) {
        markerRef.current.addTo(mapInstance.current);
      }
      mapInstance.current.setView([newLat, newLng], zoom);
    }
  }

  async function geocode(params: Record<string, string>): Promise<GeocodeResult | null> {
    const query = new URLSearchParams(params);
    const res = await fetch(`/api/geocode?${query.toString()}`);
    if (!res.ok) return null;
    const results: GeocodeResult[] = await res.json();
    return results[0] ?? null;
  }

  async function handlePostalCodeBlur() {
    if (!postalCode.trim()) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const result = await geocode({ postalcode: postalCode, ...(country ? { country } : {}) });
      if (result) {
        if (result.country) setCountry(result.country);
        if (result.state) setState(result.state);
        if (result.city && !city) setCity(result.city);
      } else {
        setStatusMessage("Land/Bundesland zu dieser PLZ nicht gefunden.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLocateAddress() {
    setBusy(true);
    setStatusMessage(null);
    try {
      // Try the full street address first, then fall back to just the city
      // if that doesn't resolve to anything (e.g. street not in OSM data).
      const fullQuery = [
        [street, houseNumber].filter(Boolean).join(" "),
        postalCode,
        city,
        country,
      ]
        .filter(Boolean)
        .join(", ");

      let result: GeocodeResult | null = null;
      if (street && (city || postalCode)) {
        result = await geocode({ q: fullQuery });
        // Free-text search can return a poor match instead of no match at
        // all (e.g. a street name that also exists elsewhere) when the
        // query is underspecified. If we know the postal code and the
        // result disagrees, treat it as not found and fall back to the city.
        if (result && postalCode && result.postalCode && result.postalCode !== postalCode) {
          result = null;
        }
      }
      if (!result && (city || postalCode)) {
        const fallbackQuery = [postalCode, city, country].filter(Boolean).join(", ");
        result = await geocode({ q: fallbackQuery });
        if (result) {
          setStatusMessage(
            "Straße nicht gefunden — Standort wurde anhand des Ortes gesetzt.",
          );
        }
      }
      if (!result) {
        setStatusMessage("Adresse nicht gefunden. Bitte Standort manuell auf der Karte markieren.");
        return;
      }
      moveMapTo(Number(result.lat), Number(result.lon));
      if (!statusMessage) setStatusMessage("Standort auf der Karte gesetzt.");
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveMapTo(pos.coords.latitude, pos.coords.longitude);
        setStatusMessage("Dein aktueller Standort wurde übernommen.");
        setBusy(false);
      },
      () => {
        setStatusMessage("Standort konnte nicht ermittelt werden.");
        setBusy(false);
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="postalCode" className="font-medium">
            Postleitzahl
          </label>
          <input
            id="postalCode"
            name="postalCode"
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            onBlur={handlePostalCodeBlur}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="font-medium">
            Ort
          </label>
          <input
            id="city"
            name="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={handleLocateAddress}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className="font-medium">
            Land
          </label>
          <input
            id="country"
            name="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="state" className="font-medium">
            Bundesland
          </label>
          <input
            id="state"
            name="state"
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="-mt-2 text-sm text-text-muted">
        Land und Bundesland werden anhand der Postleitzahl vorgeschlagen — bei
        Bedarf einfach überschreiben.
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 flex flex-col gap-1.5">
          <label htmlFor="street" className="font-medium">
            Straße
          </label>
          <input
            id="street"
            name="street"
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            onBlur={handleLocateAddress}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="houseNumber" className="font-medium">
            Nr.
          </label>
          <input
            id="houseNumber"
            name="houseNumber"
            type="text"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            onBlur={handleLocateAddress}
            className={inputClass}
          />
        </div>
      </div>

      {showRegionDescription ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="regionDescription" className="font-medium">
            Unspezifische Ortsangabe
          </label>
          <input
            id="regionDescription"
            name="regionDescription"
            type="text"
            placeholder="z. B. Großraum Allgäu"
            defaultValue={defaults.regionDescription}
            className={inputClass}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLocateAddress}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover disabled:opacity-60"
        >
          {busy ? "Suche…" : "Adresse auf Karte anzeigen"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg disabled:opacity-60"
        >
          📍 Meinen Standort verwenden
        </button>
      </div>
      {statusMessage ? (
        <p className="text-sm text-text-muted">{statusMessage}</p>
      ) : null}

      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl" />
      <p className="-mt-2 text-sm text-text-muted">
        Auf die Karte klicken, um den Standort von Hand zu setzen oder zu
        korrigieren.
      </p>

      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
    </div>
  );
}
