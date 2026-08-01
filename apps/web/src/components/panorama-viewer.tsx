"use client";

import "@photo-sphere-viewer/core/index.css";
import { useEffect, useRef } from "react";
import type { Viewer } from "@photo-sphere-viewer/core";

/**
 * Renders a 360°/equirectangular panorama via Photo Sphere Viewer. Loaded
 * dynamically inside an effect (like the app's Leaflet maps) since it's a
 * WebGL/canvas library that touches `window` at module load and can't be a
 * top-level import in code that might render on the server; the CSS is a
 * plain top-level import instead, matching how Leaflet's own stylesheet is
 * imported elsewhere — Next.js's bundler handles that specially regardless
 * of SSR.
 *
 * Two modes:
 * - "interactive" (gallery lightbox): full navbar (zoom/fullscreen), free
 *   mouse/touch drag and zoom, no auto-rotation.
 * - "ambient" (detail-page hero preview): no navbar, starts auto-rotating
 *   immediately at a slow, subtle speed via the autorotate plugin — "a
 *   cropped view of the 360° image that slowly turns" rather than a full
 *   viewer widget. Manual drag still works and auto-rotation resumes after
 *   the user goes idle (the plugin's own default behavior).
 */
export function PanoramaViewer({
  url,
  mode,
  className,
}: {
  url: string;
  mode: "interactive" | "ambient";
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let viewer: Viewer | null = null;
    let cancelled = false;

    Promise.all([
      import("@photo-sphere-viewer/core"),
      import("@photo-sphere-viewer/autorotate-plugin"),
    ]).then(([{ Viewer: ViewerClass }, { AutorotatePlugin }]) => {
      if (cancelled || !containerRef.current) return;
      viewer = new ViewerClass({
        container: containerRef.current,
        panorama: url,
        navbar: mode === "interactive",
        mousewheel: mode === "interactive",
        plugins:
          mode === "ambient"
            ? [[AutorotatePlugin, { autostartDelay: 0, autorotateSpeed: "0.5rpm" }]]
            : [],
      });
    });

    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [url, mode]);

  return <div ref={containerRef} className={className} />;
}
