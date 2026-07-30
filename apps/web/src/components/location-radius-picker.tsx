"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useRef, useState } from "react";
import { getLeafletWithCluster } from "@/lib/leaflet-cluster";
import { escapeHtml, type MapResultItem } from "@/lib/map-result-item";

const RADIUS_STEPS: (number | null)[] = [1, 5, 10, 20, 50, 75, 100, 150, 200, 300, null];

function pinSvg(fill: string, stroke: string): string {
  return `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 27 15 27s15-15.75 15-27C30 6.716 23.284 0 15 0z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`;
}

const PIN_SVG = pinSvg("#b14f24", "#7a3116");
// Bigger and in the theme's secondary (green) color, so the "selected result"
// pin reads as clearly distinct from both the small result dots and the
// primary-colored "search from" origin pin above.
const SELECTED_PIN_SVG = pinSvg("#61703f", "#3d4a27");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPinIcon(L: any) {
  return L.divIcon({
    html: PIN_SVG,
    className: "",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSelectedPinIcon(L: any) {
  return L.divIcon({
    html: SELECTED_PIN_SVG,
    className: "",
    iconSize: [38, 53],
    iconAnchor: [19, 53],
    popupAnchor: [0, -48],
  });
}

export function LocationRadiusPicker({
  defaultLat,
  defaultLng,
  defaultRadius,
  resultItems,
  selectedId,
  onChange,
}: {
  defaultLat?: string;
  defaultLng?: string;
  defaultRadius?: string;
  // When provided, search results are rendered as clustered markers in this
  // same map instead of a separate ResultsMap below the form.
  resultItems?: MapResultItem[];
  // Id (matching a resultItems entry) of the listing/event currently shown
  // in the detail pane, if any — rendered as its own distinct, larger pin
  // (see createSelectedPinIcon) directly on the map rather than inside the
  // marker-cluster group, so it's never hidden inside a cluster bubble and
  // always reads as visually distinct from both the plain result dots and
  // the origin/"search from" pin.
  selectedId?: string;
  // Called whenever lat/lng/radius change due to user interaction (map
  // click, place search, geolocation, or the radius slider) — lets a parent
  // search form auto-apply filters without a submit button.
  onChange?: () => void;
}) {
  const [lat, setLat] = useState<number | null>(
    defaultLat ? Number(defaultLat) : null,
  );
  const [lng, setLng] = useState<number | null>(
    defaultLng ? Number(defaultLng) : null,
  );
  const [placeQuery, setPlaceQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const initialRadiusIndex = (() => {
    if (!defaultRadius) return RADIUS_STEPS.length - 1;
    const idx = RADIUS_STEPS.findIndex((r) => r === Number(defaultRadius));
    return idx === -1 ? RADIUS_STEPS.length - 1 : idx;
  })();
  const [radiusIndex, setRadiusIndex] = useState(initialRadiusIndex);
  const radiusValue = RADIUS_STEPS[radiusIndex];
  const [mapVisible, setMapVisible] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultsLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const skipFirstChange = useRef(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderSelectedMarker(L: any, map: any) {
    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }
    const item = selectedId ? resultItems?.find((i) => i.id === selectedId) : undefined;
    if (!item) return;
    const marker = L.marker([item.latitude, item.longitude], {
      icon: createSelectedPinIcon(L),
      zIndexOffset: 1000,
    });
    marker.bindTooltip(`<strong>${escapeHtml(item.label)}</strong>`, {
      permanent: true,
      direction: "top",
      offset: [0, -50],
      className: "ligem-event-label",
    });
    marker.addTo(map);
    selectedMarkerRef.current = marker;
  }

  useEffect(() => {
    let cancelled = false;
    getLeafletWithCluster().then((L) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const startLat = lat ?? 51.1657;
      const startLng = lng ?? 10.4515;
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(
        [startLat, startLng],
        lat != null ? 11 : 6,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { icon: createPinIcon(L) });
      if (lat != null && lng != null) marker.addTo(map);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        if (!map.hasLayer(marker)) marker.addTo(map);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });

      mapInstance.current = map;
      markerRef.current = marker;
      leafletRef.current = L;

      if (lat != null && lng != null && radiusValue != null) {
        const circle = L.circle([lat, lng], {
          radius: radiusValue * 1000,
          color: "#b14f24",
          fillColor: "#b14f24",
          fillOpacity: 0.1,
          weight: 1.5,
        }).addTo(map);
        circleRef.current = circle;
        map.fitBounds(circle.getBounds(), { padding: [24, 24] });
      }

      // Search results are static for the lifetime of this (server-rendered)
      // page, so they're rendered once here rather than in a dependent
      // effect — a `[resultItems]` effect would never re-fire once mounted,
      // since the prop reference never changes after this initial render.
      if (resultItems && resultItems.length > 0) {
        const clusterGroup = L.markerClusterGroup({ maxClusterRadius: 50 });
        resultItems.forEach((item) => {
          const resultMarker = L.circleMarker([item.latitude, item.longitude], {
            radius: 9,
            color: "#b14f24",
            fillColor: "#b14f24",
            fillOpacity: 0.85,
          });
          const labelHtml = item.sublabel
            ? `<strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(item.sublabel)}`
            : `<strong>${escapeHtml(item.label)}</strong>`;
          resultMarker.bindTooltip(labelHtml, {
            permanent: true,
            direction: "top",
            offset: [0, -8],
            className: "ligem-event-label",
          });
          resultMarker.bindPopup(
            `<a href="${item.href}" style="font-weight:600;color:#b14f24;">${escapeHtml(item.label)}</a>`,
          );
          clusterGroup.addLayer(resultMarker);
        });
        map.addLayer(clusterGroup);
        resultsLayerRef.current = clusterGroup;

        const points: [number, number][] = resultItems.map((i) => [i.latitude, i.longitude]);
        if (lat != null && lng != null) points.push([lat, lng]);
        map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 13 });
      }

      renderSelectedMarker(L, map);
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

  // A separate, targeted effect (rather than folding this into the
  // mount-only effect above) because `selectedId` — unlike `resultItems` —
  // is a plain string that legitimately changes value across soft
  // navigations within the same page (clicking from one result's detail to
  // another's), so a dependent effect here does re-fire correctly.
  useEffect(() => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (map && L) renderSelectedMarker(L, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (map && L) {
      if (lat == null || lng == null || radiusValue == null) {
        if (circleRef.current) {
          map.removeLayer(circleRef.current);
          circleRef.current = null;
        }
      } else {
        const radiusMeters = radiusValue * 1000;
        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]);
          circleRef.current.setRadius(radiusMeters);
        } else {
          circleRef.current = L.circle([lat, lng], {
            radius: radiusMeters,
            color: "#b14f24",
            fillColor: "#b14f24",
            fillOpacity: 0.1,
            weight: 1.5,
          }).addTo(map);
        }
        map.fitBounds(circleRef.current.getBounds(), { padding: [24, 24] });
      }
    }

    if (skipFirstChange.current) {
      skipFirstChange.current = false;
    } else {
      onChange?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radiusValue]);

  // Leaflet doesn't notice its container resizing while hidden (display:
  // none), so it needs a nudge once it becomes visible again.
  useEffect(() => {
    if (mapVisible && mapInstance.current) {
      requestAnimationFrame(() => mapInstance.current?.invalidateSize());
    }
  }, [mapVisible]);

  function moveTo(newLat: number, newLng: number, zoom = 12) {
    setLat(newLat);
    setLng(newLng);
    if (mapInstance.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      if (!mapInstance.current.hasLayer(markerRef.current)) {
        markerRef.current.addTo(mapInstance.current);
      }
      if (radiusValue == null) {
        mapInstance.current.setView([newLat, newLng], zoom);
      }
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveTo(pos.coords.latitude, pos.coords.longitude);
        setBusy(false);
      },
      () => {
        setMessage("Standort konnte nicht ermittelt werden.");
        setBusy(false);
      },
    );
  }

  async function searchPlace() {
    if (!placeQuery.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(placeQuery)}`);
      const data = await res.json();
      if (data?.[0]) {
        moveTo(Number(data[0].lat), Number(data[0].lon));
      } else {
        setMessage("Ort nicht gefunden.");
      }
    } catch {
      setMessage("Suche fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-medium">Umkreissuche</legend>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={placeQuery}
          onChange={(e) => setPlaceQuery(e.target.value)}
          placeholder="Ort eingeben, z. B. Kempten"
          className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 text-sm"
        />
        <button
          type="button"
          onClick={searchPlace}
          disabled={busy}
          className="min-h-11 rounded-full bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover disabled:opacity-60"
        >
          {busy ? "Suche…" : "Suchen"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="min-h-11 rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg disabled:opacity-60"
        >
          📍 Mein Standort
        </button>
      </div>
      {message ? <p className="text-sm text-error">{message}</p> : null}

      <div className="relative">
        <div
          ref={mapRef}
          className={
            mapVisible
              ? `w-full overflow-hidden rounded-xl ${resultItems ? "h-56" : "h-40"}`
              : "hidden"
          }
        />
        {mapVisible ? (
          <button
            type="button"
            onClick={() => setMapVisible(false)}
            aria-label="Karte ausblenden"
            className="absolute right-2 top-2 z-[1000] flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg font-medium text-text shadow-md transition-colors hover:bg-bg"
          >
            ✕
          </button>
        ) : null}
      </div>
      {mapVisible ? (
        <p className="-mt-1 text-sm text-text-muted">
          Auf die Karte klicken, um den Ausgangspunkt der Suche zu setzen.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setMapVisible(true)}
          className="-mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
        >
          👁️ Karte einblenden
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="radiusSlider" className="text-sm font-medium">
          Umkreis: {radiusValue == null ? "Alle" : `${radiusValue} km`}
        </label>
        <input
          id="radiusSlider"
          type="range"
          min={0}
          max={RADIUS_STEPS.length - 1}
          step={1}
          value={radiusIndex}
          onChange={(e) => setRadiusIndex(Number(e.target.value))}
          className="ligem-radius-slider w-full"
        />
      </div>

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />
      <input type="hidden" name="radius" value={radiusValue ?? ""} />
    </fieldset>
  );
}
