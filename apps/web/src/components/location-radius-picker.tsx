"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
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
  // Enlarges the map to a fixed, full-viewport-width overlay (with a
  // click-to-close backdrop) instead of the small inline preview — the small
  // map is too cramped to really use (pan/zoom/read labels) once there are
  // several result markers on it.
  const [expanded, setExpanded] = useState(false);

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
  // Bounds that fit every result (+ the search origin, if set), captured
  // once at mount so we can zoom back out to it when a selection is
  // cleared — see renderSelectedMarker below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overviewBoundsRef = useRef<any>(null);
  const skipFirstChange = useRef(true);

  // Bounds that fit every result marker plus the search origin, extended to
  // always also include the full radius circle when one is active. This is
  // the single source of "what should the map currently show" — called from
  // both the results-layer effect (resultItems/selectedId change) and the
  // radius-circle effect (lat/lng/radiusValue change), since those two used
  // to each call their own fitBounds independently and race each other:
  // moving the radius slider re-fetches a new (filtered) resultItems array a
  // moment later, and whichever fitBounds happened to run last won — often
  // leaving the radius circle only partially visible again right after it
  // had just been fitted. Folding both into one shared bounds computation
  // means the circle is always included no matter which one fires last.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fitOverviewView(L: any, map: any) {
    const points: [number, number][] = (resultItems ?? []).map((i) => [i.latitude, i.longitude]);
    if (lat != null && lng != null) points.push([lat, lng]);
    if (points.length === 0 && !circleRef.current) return;
    const bounds = points.length > 0 ? L.latLngBounds(points) : circleRef.current.getBounds();
    if (circleRef.current) bounds.extend(circleRef.current.getBounds());
    overviewBoundsRef.current = bounds;
    // Don't yank the view back to the overview if a specific item is
    // currently focused (see renderSelectedMarker) — that effect already
    // owns the view in that case, using the overview bounds just updated
    // above as its own fallback once the selection is cleared again.
    if (!selectedId) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
    }
  }

  // Rebuilds the clustered result-marker layer from the current
  // `resultItems` prop. This used to run only once at mount, on the
  // (incorrect) assumption that resultItems never meaningfully changes
  // after that — but changing any filter re-renders the server-component
  // page with a genuinely new, differently-filtered array, so without this
  // the map kept showing whatever was found on the very first load
  // regardless of later filtering (e.g. filtering down to 2 results still
  // showed all the original markers). Called both at mount and from the
  // `[resultItems, selectedId]` effect below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderResultsLayer(L: any, map: any) {
    if (resultsLayerRef.current) {
      map.removeLayer(resultsLayerRef.current);
      resultsLayerRef.current = null;
    }
    if (resultItems && resultItems.length > 0) {
      // spiderfyDistanceMultiplier spaces out markers a bit further than
      // the default when a cluster is spiderfied (clicked while already at
      // max zoom) — without it, markers that sit at nearly the same
      // coordinates (e.g. several events at the same listing's address)
      // spiderfy close enough together that their permanent labels
      // (below) visually overlap into an unreadable mess.
      const clusterGroup = L.markerClusterGroup({ maxClusterRadius: 50, spiderfyDistanceMultiplier: 3 });
      // Permanent labels only make sense one-at-a-time — while a cluster is
      // spiderfied its markers are already visually spread out and
      // individually clickable, so their labels are hidden for that brief
      // state to avoid overlapping each other regardless of spacing.
      clusterGroup.on("spiderfied", (e: { markers: { closeTooltip: () => void }[] }) => {
        e.markers.forEach((m) => m.closeTooltip());
      });
      clusterGroup.on("unspiderfied", (e: { markers: { openTooltip: () => void }[] }) => {
        e.markers.forEach((m) => m.openTooltip());
      });
      resultItems.forEach((item) => {
        const resultMarker = L.circleMarker([item.latitude, item.longitude], {
          radius: 9,
          color: "#b14f24",
          fillColor: "#b14f24",
          fillOpacity: 0.85,
        });
        // The selected item already gets its own dedicated marker + label
        // directly on the map (see renderSelectedMarker) so it's never
        // hidden inside a cluster bubble — binding a second permanent
        // tooltip here too would show two overlapping labels for the same
        // spot, so this one is skipped for whichever item is selected.
        if (item.id !== selectedId) {
          const labelHtml = item.sublabel
            ? `<strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(item.sublabel)}`
            : `<strong>${escapeHtml(item.label)}</strong>`;
          resultMarker.bindTooltip(labelHtml, {
            permanent: true,
            direction: "top",
            offset: [0, -8],
            className: "ligem-event-label",
            // Tooltips are non-interactive (pointer-events: none) by
            // default, so a click on the label would otherwise fall
            // through to whatever's underneath instead of opening the
            // marker's popup.
            interactive: true,
          });
          resultMarker.getTooltip()?.on("click", () => resultMarker.openPopup());
        }
        // Uses the caller-supplied rich "business card" HTML when given
        // (see /projekte/page.tsx's buildListingPopupHtml) — otherwise the
        // whole popup is one plain clickable link to the item's detail
        // page, with its Projekttyp/Veranstaltungsart shown as a small
        // badge underneath.
        const popupHtml =
          item.popupHtml ??
          `<a href="${item.href}" style="display:block;color:inherit;text-decoration:none;">
          <strong style="color:#b14f24;">${escapeHtml(item.label)}</strong>
          ${item.type ? `<br><span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:9999px;background:#eee2d3;font-size:0.8em;">${escapeHtml(item.type)}</span>` : ""}
        </a>`;
        resultMarker.bindPopup(popupHtml, { maxWidth: 260 });
        clusterGroup.addLayer(resultMarker);
      });
      map.addLayer(clusterGroup);
      resultsLayerRef.current = clusterGroup;
    }
    fitOverviewView(L, map);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderSelectedMarker(L: any, map: any) {
    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }
    const item = selectedId ? resultItems?.find((i) => i.id === selectedId) : undefined;
    if (!item) {
      // No (more) selection — zoom back out to the overview instead of
      // leaving the map focused on whatever was selected last.
      if (overviewBoundsRef.current) {
        map.fitBounds(overviewBoundsRef.current, { padding: [24, 24], maxZoom: 13 });
      }
      return;
    }
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

    // Zoom to a ~20km-radius view around the selected listing/event, via a
    // throwaway circle's bounds rather than a fixed zoom level, since the
    // zoom that shows "20km" varies with latitude and viewport size — same
    // technique the Umkreissuche radius circle below already uses for its
    // own view. Leaflet's Circle.getBounds() needs the circle to actually be
    // on the map first (it reads back its own projected screen position),
    // so this adds it, reads the bounds, and removes it again immediately —
    // it's never visible, just used for the one bounds computation.
    const focusCircle = L.circle([item.latitude, item.longitude], { radius: 20_000 }).addTo(map);
    const focusBounds = focusCircle.getBounds();
    map.removeLayer(focusCircle);
    map.fitBounds(focusBounds, { padding: [24, 24] });
  }

  useEffect(() => {
    let cancelled = false;
    getLeafletWithCluster().then((L) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const startLat = lat ?? 51.1657;
      const startLng = lng ?? 10.4515;
      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        // Requires two fingers to pan/zoom via touch (a single finger falls
        // through to the page's normal scroll instead, since a one-finger
        // drag is very easy to trigger by accident while scrolling past an
        // embedded map on a phone) and requires Ctrl/Cmd+scroll to zoom on
        // desktop — via leaflet-gesture-handling (loaded/registered as a
        // handler in getLeafletWithCluster), the established solution for
        // this exact "Google Maps-style" embedded-map behavior, shown with
        // a small "use two fingers"/"use ctrl+scroll" hint on the first
        // blocked attempt.
        gestureHandling: true,
      }).setView(
        [startLat, startLng],
        lat != null ? 11 : 6,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { icon: createPinIcon(L) });
      if (lat != null && lng != null) marker.addTo(map);

      mapInstance.current = map;
      markerRef.current = marker;
      leafletRef.current = L;

      if (lat != null && lng != null && radiusValue != null) {
        circleRef.current = L.circle([lat, lng], {
          radius: radiusValue * 1000,
          color: "#b14f24",
          fillColor: "#b14f24",
          fillOpacity: 0.1,
          weight: 1.5,
        }).addTo(map);
      }

      renderResultsLayer(L, map);
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
  // mount-only effect above) because both `resultItems` (a new array on
  // every filter-driven navigation) and `selectedId` (a plain string that
  // changes across soft navigations between two results' details)
  // legitimately change value across soft navigations within the same
  // page, so a dependent effect here does re-fire correctly — unlike the
  // very first render, where the map isn't necessarily created yet (see the
  // async mount effect above), which is why that effect also calls both
  // functions directly for the initial paint.
  useEffect(() => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (map && L) {
      renderResultsLayer(L, map);
      renderSelectedMarker(L, map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultItems, selectedId]);

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
      }
      fitOverviewView(L, map);
    }

    if (skipFirstChange.current) {
      skipFirstChange.current = false;
    } else {
      onChange?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radiusValue]);

  // Closing the expanded map via Escape as well as the explicit ✕ button and
  // the backdrop click below — standard expectation for anything that opens
  // as a full-viewport overlay.
  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  // Leaflet doesn't notice its container resizing while hidden (display:
  // none) or while toggling between the small preview and the expanded
  // overlay size, so both need a nudge — and since the container's pixel
  // size just changed, the current view is re-fitted afterwards too
  // (whichever view was active: the selected-item focus, or the overview).
  useEffect(() => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (mapVisible && map && L) {
      // The overlay panel with the place search/radius slider (see below)
      // sits flush along the full bottom edge while expanded, which would
      // otherwise hide Leaflet's required attribution control (default
      // position: bottom-right) behind it — move it out of the way, next to
      // the zoom control, instead.
      map.attributionControl?.setPosition(expanded ? "topleft" : "bottomright");
      requestAnimationFrame(() => {
        map.invalidateSize();
        if (selectedId) {
          renderSelectedMarker(L, map);
        } else {
          fitOverviewView(L, map);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVisible, expanded]);

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

  // Shared between the normal below-map position and the overlay panel
  // rendered on top of the enlarged map (see `expanded` below) — the same
  // controlled inputs either way, so toggling `expanded` just moves this
  // block to a different spot in the tree rather than losing any value.
  const searchControls = (
    <>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            placeholder="Ort oder Region eingeben"
            className="min-h-11 w-full rounded-xl border border-text/20 bg-bg py-2 pl-3 pr-11 text-sm"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={busy}
            aria-label="Meinen Standort verwenden"
            title="Meinen Standort verwenden"
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={searchPlace}
          disabled={busy}
          className="min-h-11 rounded-full bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover disabled:opacity-60"
        >
          {busy ? "Suche…" : "Suchen"}
        </button>
      </div>
      {message ? <p className="text-sm text-error">{message}</p> : null}

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
    </>
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-medium">Umkreissuche</legend>

      <div className="relative">
        {expanded ? (
          <div
            className="fixed inset-0 z-[1998] bg-black/40"
            onClick={() => setExpanded(false)}
          />
        ) : null}
        <div
          className={
            !mapVisible
              ? "hidden"
              : expanded
                ? "fixed inset-0 z-[1999] overflow-hidden bg-surface sm:inset-8 sm:m-auto sm:max-h-[70vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-text/20 sm:shadow-2xl"
                : `relative w-full overflow-hidden rounded-xl ${resultItems ? "h-56" : "h-40"}`
          }
        >
          {/*
            className here must stay a constant string across every render —
            L.map() adds its own classes (leaflet-container, leaflet-touch,
            ...) directly to this element, and React overwrites the whole
            `class` attribute whenever the className *prop value* changes
            between renders (it diffs against what it last wrote, not
            against the DOM's current class list), which would wipe out
            Leaflet's own classes the moment `expanded` toggled. The actual
            size/shape now lives entirely on the wrapper div above instead.
          */}
          <div ref={mapRef} className="h-full w-full" />
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Karte verkleinern"
              className="absolute right-2 top-2 z-[2000] flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg font-medium text-text shadow-md transition-colors hover:bg-bg"
            >
              ✕
            </button>
          ) : mapVisible ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Karte vergrößern"
                title="Karte vergrößern"
                // Styled to match Leaflet's own zoom-control buttons
                // (.leaflet-bar a) rather than the app's usual rounded
                // surface buttons, and placed bottom-right — Leaflet's
                // default zoom control already occupies top-left, and
                // "Karte ausblenden" occupies top-right.
                className="absolute bottom-2 right-2 z-[1000] flex h-[26px] w-[26px] items-center justify-center rounded bg-white text-lg leading-none text-[#333] shadow-[0_1px_5px_rgba(0,0,0,0.65)] hover:bg-gray-100"
              >
                ⤢
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapVisible(false);
                  setExpanded(false);
                }}
                aria-label="Karte ausblenden"
                className="absolute right-2 top-2 z-[1000] flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg font-medium text-text shadow-md transition-colors hover:bg-bg"
              >
                ✕
              </button>
            </>
          ) : null}
          {expanded ? (
            // Overlaid on the bottom of the enlarged map itself, rather than
            // only below it in normal flow, so the place search and radius
            // slider stay usable without having to shrink the map back down
            // first — a solid (not translucent) background keeps the
            // controls readable over the map tiles underneath.
            <div className="absolute inset-x-0 bottom-0 z-[1500] flex flex-col gap-3 bg-surface p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.15)] sm:p-4">
              {searchControls}
            </div>
          ) : null}
        </div>
      </div>
      {!mapVisible ? (
        <button
          type="button"
          onClick={() => setMapVisible(true)}
          className="-mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
        >
          👁️ Karte einblenden
        </button>
      ) : null}

      {!expanded ? searchControls : null}

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />
      <input type="hidden" name="radius" value={radiusValue ?? ""} />
    </fieldset>
  );
}
