// leaflet.markercluster's CJS build mutates the Leaflet *global* `L`
// directly (`L.MarkerClusterGroup = ...`) instead of `require("leaflet")`-ing
// its own reference, and the object returned by a dynamic `import("leaflet")`
// is a frozen ES module namespace object that can't receive new properties.
// leaflet-gesture-handling's UMD build does the exact same thing
// (`L.Handler.extend(...)`/`L.Map.addInitHook(...)` against a bare global
// `L`, no import of its own). We keep exactly one mutable copy of `L` for
// the whole browser session and only import each plugin once against it —
// every caller (across every map component, and across client-side
// navigations within the same session) must reuse this same object, since a
// plugin's augmentation only ever lands on whichever object was `window.L`
// the first time it was imported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let inflight: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLeafletWithCluster(): Promise<any> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = import("leaflet").then(async (mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L: any = { ...mod };
    (window as unknown as { L: unknown }).L = L;
    await import("leaflet.markercluster");
    await import("leaflet-gesture-handling");
    cached = L;
    return L;
  });
  return inflight;
}
