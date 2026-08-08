"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { LocateFixed } from "lucide-react";
import { getLeafletWithCluster } from "@/lib/leaflet-cluster";
import { escapeHtml, type MapResultItem } from "@/lib/map-result-item";
import { TILE_URL, TILE_ATTRIBUTION } from "@/lib/map-tiles";

const RADIUS_STEPS: (number | null)[] = [1, 5, 10, 20, 50, 75, 100, 150, 200, 300, null];

// Shape returned by /api/geocode (see that route) — used for both the
// place-name autocomplete dropdown and the plain "Suchen" fallback below.
type GeocodeSuggestion = {
  lat: string;
  lon: string;
  displayName: string;
};

function pinSvg(fill: string, stroke: string): string {
  return `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 27 15 27s15-15.75 15-27C30 6.716 23.284 0 15 0z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`;
}

// Bigger and in the theme's secondary (green) color, so the "selected result"
// pin reads as clearly distinct from both the small result dots and the
// primary-colored "search from" origin marker below.
const SELECTED_PIN_SVG = pinSvg("#61703f", "#3d4a27");

// The search-origin marker — a target/crosshair glyph (lucide's
// "locate-fixed", the exact same icon as the "Meinen Standort verwenden"
// button next to the place-search input) on a solid primary-color circle
// with a white ring, rather than a generic map pin — so this one specific
// marker reads unambiguously as "this is where you're searching from" (the
// same idea "Meinen Standort" buttons use everywhere) regardless of whether
// it got there via that button, a place search, or a direct map click.
const MY_LOCATION_ICON_HTML = `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#b14f24;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.5);color:#fff;">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>
  </svg>
</span>`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPinIcon(L: any) {
  return L.divIcon({
    html: MY_LOCATION_ICON_HTML,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
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

// The same "Home"/"CalendarDays" icon-on-a-solid-color-circle badge used
// everywhere else in the app (see src/components/entity-icon-badge.tsx) —
// reproduced here as raw SVG/HTML since Leaflet's divIcon renders outside
// React and can't host a React component. Path data copied verbatim from
// lucide-react's "house"/"calendar-days" icons (the ones Home/CalendarDays
// alias to) so this reads as the exact same glyph, just sized for a map
// marker rather than inline UI. Used for every "found Projekt"/"found
// Termin" result marker, replacing the plain colored dot that used to mark
// these spots.
const ENTITY_MARKER_PATHS = {
  projekt:
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  termin:
    '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
} as const;

// Matches SOLID_ACTION_TONE_CLASSES (bg-primary/90, bg-secondary/90).
const ENTITY_MARKER_COLORS = { projekt: "#b14f24", termin: "#61703f" } as const;

function entityMarkerHtml(tone: "projekt" | "termin"): string {
  return `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${ENTITY_MARKER_COLORS[tone]}E6;box-shadow:0 1px 4px rgba(0,0,0,0.4);color:#fff;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ENTITY_MARKER_PATHS[tone]}</svg>
  </span>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createEntityMarkerIcon(L: any, tone: "projekt" | "termin") {
  return L.divIcon({
    html: entityMarkerHtml(tone),
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

export function LocationRadiusPicker({
  defaultLat,
  defaultLng,
  defaultRadius,
  resultItems,
  resultTone = "projekt",
  selectedId,
  onChange,
}: {
  defaultLat?: string;
  defaultLng?: string;
  defaultRadius?: string;
  // When provided, search results are rendered as clustered markers in this
  // same map instead of a separate ResultsMap below the form.
  resultItems?: MapResultItem[];
  // Which entity type resultItems are — picks the Home/CalendarDays marker
  // icon and its primary/secondary color (see createEntityMarkerIcon).
  // Defaults to "projekt" since /projekte was this component's first user;
  // /termine passes "termin" explicitly.
  resultTone?: "projekt" | "termin";
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
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before setPlaceQuery(suggestion.displayName) so the debounced
  // suggestions effect below (keyed on placeQuery) doesn't immediately
  // re-fetch and re-open the dropdown for the value we just picked.
  const suppressNextSuggestionFetch = useRef(false);

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
  // Always holds the current render's `moveTo` closure — read from the
  // map's own "click" listener, which is registered exactly once in the
  // mount-only effect below. A listener registered there would otherwise
  // permanently close over that first render's `moveTo` (and, transitively,
  // its `radiusValue`), the same stale-closure trap documented at
  // `lastChangeKey` below; updating this ref on every render instead keeps
  // the click handler reading current state without re-registering it.
  const moveToRef = useRef<(lat: number, lng: number) => void>(() => {});
  // Bounds that fit every result (+ the search origin, if set), captured
  // once at mount so we can zoom back out to it when a selection is
  // cleared — see renderSelectedMarker below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overviewBoundsRef = useRef<any>(null);
  // Tracks the last [lat, lng, radiusValue] combination `onChange` was
  // actually fired for, initialized once (during render, not inside an
  // effect) to the values the component starts with — so the dependent
  // effect below only calls `onChange` when this combination genuinely
  // changes, not on mount. A plain "have I run once" boolean ref doesn't
  // work here: React 18 Strict Mode's dev-only double-invoke of effects
  // (mount → cleanup → mount again, to help surface impure effects) flips
  // such a flag from true to false on the *first* of those two synthetic
  // mounts, so the second one already sees it as false and incorrectly
  // fires `onChange` — reported directly as clicking a same-origin link
  // like "Veranstaltet von {Projekt}" landing on `/projekte?projekt=<id>`
  // and then immediately being rewritten to `/projekte?sortierung=neueste`
  // (the sidebar form's own default state, with the `projekt` selection
  // silently dropped since it isn't one of the form's own fields). Storing
  // the actual value instead of a boolean is immune to this: re-running
  // the effect with an unchanged value is always a no-op, no matter how
  // many times (1 or 2) it fires for that same value.
  const lastChangeKey = useRef(`${lat}|${lng}|${radiusValue}`);

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
        const resultMarker = L.marker([item.latitude, item.longitude], {
          icon: createEntityMarkerIcon(L, resultTone),
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
          <strong style="color:${ENTITY_MARKER_COLORS[resultTone]};">${escapeHtml(item.label)}</strong>
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
      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { icon: createPinIcon(L) });
      if (lat != null && lng != null) marker.addTo(map);

      // A plain click on the base map (never fired for clicks on markers/
      // popups/controls — those are separate Leaflet layer events, not DOM
      // bubbling) sets the search origin there, keeping whatever radius is
      // already selected — see moveTo. Reads through moveToRef rather than
      // closing over `moveTo` directly since this listener is registered
      // exactly once here at mount (see moveToRef's own comment above).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        moveToRef.current(e.latlng.lat, e.latlng.lng);
      });

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

    const key = `${lat}|${lng}|${radiusValue}`;
    if (lastChangeKey.current !== key) {
      lastChangeKey.current = key;
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
  // Refreshed after every render (not written directly during render — the
  // same "no ref writes during render" rule that bit homepage-hero-tiles.tsx
  // earlier applies here too) so the map's click listener, registered once
  // in the mount effect below, always calls a current `moveTo` via
  // `moveToRef.current(...)`.
  useEffect(() => {
    moveToRef.current = moveTo;
  });

  // Clears the search origin entirely — both the map marker/circle and the
  // "Ort oder Region eingeben" text field — via the small "✕" next to that
  // input. Deliberately doesn't touch the radius selection itself (only the
  // origin the radius would apply around), matching what was actually
  // asked for.
  function clearLocation() {
    setPlaceQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setLat(null);
    setLng(null);
    if (mapInstance.current && markerRef.current && mapInstance.current.hasLayer(markerRef.current)) {
      mapInstance.current.removeLayer(markerRef.current);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Same "move map + default radius to 50km if still 'Alle' + collapse
        // UI to the results" behavior as picking a place from the search
        // box — a browser-geolocated origin deserves the same treatment as
        // a searched one, not just a bare marker with no radius applied.
        applyPlaceResult(latitude, longitude);
        // Best-effort reverse geocode so "Ort oder Region eingeben" shows a
        // real place name instead of staying blank despite a location
        // actually being set — a raw lat/lng pair on the map otherwise
        // gives no visible confirmation of what was found.
        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data?.displayName) {
            suppressNextSuggestionFetch.current = true;
            setPlaceQuery(data.displayName);
          }
        } catch {
          // Map/radius are already set regardless — the place name is a
          // nice-to-have, not required for the search itself to work.
        }
        setBusy(false);
      },
      () => {
        setMessage("Standort konnte nicht ermittelt werden.");
        setBusy(false);
      },
    );
  }

  // Debounced as-you-type autocomplete: fetches suggestions from the same
  // /api/geocode proxy the "Suchen" fallback below already uses. Skipped
  // for very short queries (noisy/meaningless this early) and right after
  // picking a suggestion (suppressNextSuggestionFetch), since setting
  // placeQuery to the chosen displayName would otherwise immediately
  // re-trigger a fetch and re-open the dropdown for the value just picked.
  useEffect(() => {
    if (suppressNextSuggestionFetch.current) {
      suppressNextSuggestionFetch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const query = placeQuery.trim();
    // A too-short query isn't actively cleared here — the dropdown's own
    // render condition below already hides it whenever the current query
    // is under this length, so there's no separate state to reset.
    if (query.length < 3) return;
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as GeocodeSuggestion[];
        setSuggestions(data);
        setSuggestionsOpen(data.length > 0);
        setActiveSuggestionIndex(-1);
      } catch {
        // Best-effort — the plain "Suchen" button below still works even
        // if live suggestions fail to load.
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [placeQuery]);

  // Shared by both the "Suchen" fallback and picking an autocomplete
  // suggestion: once a place is actually found, get out of the way of the
  // results — collapse the enlarged map back down, close "Erweiterte
  // Suche" (both would otherwise still cover most of the screen on a
  // phone), and jump straight to the results/detail pane (same anchor the
  // Weiter/Zurück-Blättern links and ScrollToTopButton already use, see
  // CLAUDE.md). `delayed` waits longer before scrolling — used when a
  // radius was just defaulted (see applyPlaceResult below), since that
  // also re-triggers the debounced auto-submit/navigation that refetches
  // a now-filtered result set; scrolling immediately would land on the
  // still-unfiltered list a moment before it changes underneath the
  // viewport, which reads as a jump/flicker rather than a smooth landing.
  function closeUiAndScrollToResults(delayed = false) {
    setExpanded(false);
    const advanced = document.getElementById("erweiterte-suche");
    if (advanced instanceof HTMLDetailsElement) advanced.open = false;
    const scrollToResults = () =>
      document.getElementById("ergebnisse")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (delayed) {
      setTimeout(scrollToResults, 700);
    } else {
      scrollToResults();
    }
  }

  // Shared by both the "Suchen" fallback and picking an autocomplete
  // suggestion once a place is actually found. A freshly entered place with
  // no radius set yet ("Alle") would otherwise still show every result
  // countrywide right next to a brand-new search origin, which doesn't
  // read as a meaningful "search around this place" — defaulting to 50km
  // gives a sensible bounded result set without requiring an extra manual
  // step.
  function applyPlaceResult(placeLat: number, placeLng: number) {
    moveTo(placeLat, placeLng);
    let radiusJustDefaulted = false;
    if (radiusValue == null) {
      const fiftyKmIndex = RADIUS_STEPS.indexOf(50);
      if (fiftyKmIndex !== -1) {
        setRadiusIndex(fiftyKmIndex);
        radiusJustDefaulted = true;
      }
    }
    closeUiAndScrollToResults(radiusJustDefaulted);
  }

  function selectSuggestion(suggestion: GeocodeSuggestion) {
    suppressNextSuggestionFetch.current = true;
    setPlaceQuery(suggestion.displayName);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    applyPlaceResult(Number(suggestion.lat), Number(suggestion.lon));
  }

  function handlePlaceInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0]);
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
    }
  }

  async function searchPlace() {
    if (!placeQuery.trim()) return;
    setBusy(true);
    setMessage(null);
    setSuggestionsOpen(false);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(placeQuery)}`);
      const data = await res.json();
      if (data?.[0]) {
        applyPlaceResult(Number(data[0].lat), Number(data[0].lon));
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
            onKeyDown={handlePlaceInputKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestionsOpen(true);
            }}
            onBlur={() => setSuggestionsOpen(false)}
            placeholder="Ort oder Region eingeben"
            role="combobox"
            aria-expanded={suggestionsOpen}
            aria-controls="ort-vorschlaege"
            aria-autocomplete="list"
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-text/20 bg-bg py-2 pl-3 pr-11 text-sm"
          />
          {placeQuery || lat != null || lng != null ? (
            // Same small "✕ overlapping the top-right corner" badge as the
            // MultiSelectDropdown filter chips' own clear button (see
            // multi-select-dropdown.tsx) — same size/position/dark-gray
            // styling, for the same "clear this selection" action language.
            <button
              type="button"
              onClick={clearLocation}
              aria-label="Ort entfernen"
              title="Ort entfernen"
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-text/60 text-[9px] leading-none text-white shadow-sm transition-colors hover:bg-text"
            >
              ✕
            </button>
          ) : null}
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
          {suggestionsOpen && suggestions.length > 0 && placeQuery.trim().length >= 3 ? (
            <ul
              id="ort-vorschlaege"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-text/20 bg-surface py-1 shadow-lg"
            >
              {suggestions.map((suggestion, i) => (
                <li key={`${suggestion.lat}-${suggestion.lon}`} role="option" aria-selected={i === activeSuggestionIndex}>
                  <button
                    type="button"
                    // preventDefault on mousedown keeps the input focused (no
                    // blur), so onClick still fires normally afterward instead
                    // of the dropdown having already closed itself via onBlur
                    // by the time the click would land.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`block w-full truncate px-3 py-2 text-left text-sm ${
                      i === activeSuggestionIndex ? "bg-bg" : "hover:bg-bg"
                    }`}
                  >
                    {suggestion.displayName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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

      {/* Only meaningful once a search origin exists — a radius without a
          center point doesn't filter anything, so the slider stays hidden
          (in both the sidebar and this same block reused in the expanded/
          "popup" map overlay, see searchControls above) until a location
          has actually been set via place search, geolocation, or a map
          click. */}
      {lat != null && lng != null ? (
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
          {/* The scale of every step the slider can land on (matching
              RADIUS_STEPS) — otherwise only the currently selected value is
              ever visible, with no indication of what the other positions
              along the slider actually mean. */}
          <div className="relative h-4 text-[10px] text-text-muted">
            {RADIUS_STEPS.map((step, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2"
                style={{ left: `${(i / (RADIUS_STEPS.length - 1)) * 100}%` }}
              >
                {step == null ? "Alle" : step}
              </span>
            ))}
          </div>
        </div>
      ) : null}
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
                : `relative w-full overflow-hidden rounded-xl ${resultItems ? "h-112" : "h-80"}`
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
