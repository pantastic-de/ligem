"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import { PanoramaViewer } from "@/components/panorama-viewer";

type GalleryPhoto = {
  id: string;
  storageKey: string;
  caption?: string | null;
  isPanorama?: boolean;
};

function PanoramaBadge() {
  return (
    <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
      <RotateCw className="h-3 w-3" aria-hidden="true" />
      360°
    </span>
  );
}

/**
 * Booking.com-style photo grid (one large hero, up to two stacked beside it,
 * a thumbnail row below with a "+N Fotos" overlay on the last one if there
 * are more) — every tile opens the same full-screen slideshow popup at that
 * photo's position. Shared between ListingDetail and EventDetail.
 */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openIndex, photos.length]);

  if (photos.length === 0) return null;

  const hero = photos[0];
  const stacked = photos.slice(1, 3);
  const thumbnails = photos.slice(3, 8);
  const extraCount = photos.length - 8;

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-2 sm:h-80 sm:grid-cols-3 sm:grid-rows-1">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className={`relative h-56 min-h-0 overflow-hidden rounded-xl sm:h-full ${stacked.length > 0 ? "sm:col-span-2" : "sm:col-span-3"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object */}
          <img
            src={`/api/media/${hero.storageKey}`}
            alt={hero.caption ?? ""}
            className="h-full w-full object-cover"
          />
          {hero.isPanorama ? <PanoramaBadge /> : null}
        </button>
        {stacked.length > 0 ? (
          <div className="flex min-h-0 flex-row gap-2 sm:h-full sm:flex-col">
            {stacked.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i + 1)}
                className="relative h-28 min-h-0 flex-1 overflow-hidden rounded-xl sm:h-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object */}
                <img
                  src={`/api/media/${photo.storageKey}`}
                  alt={photo.caption ?? ""}
                  className="h-full w-full object-cover"
                />
                {photo.isPanorama ? <PanoramaBadge /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {thumbnails.length > 0 ? (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {thumbnails.map((photo, i) => {
            const index = i + 3;
            const isLast = i === thumbnails.length - 1 && extraCount > 0;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(index)}
                className="relative h-20 overflow-hidden rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object */}
                <img
                  src={`/api/media/${photo.storageKey}`}
                  alt={photo.caption ?? ""}
                  className="h-full w-full object-cover"
                />
                {isLast ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                    + {extraCount} Fotos
                  </span>
                ) : photo.isPanorama ? (
                  <PanoramaBadge />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {openIndex !== null ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Schließen"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-xl text-white transition-colors hover:bg-white/60"
          >
            ✕
          </button>
          {photos.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
              }}
              aria-label="Vorheriges Bild"
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/40 text-2xl text-white transition-colors hover:bg-white/60"
            >
              ‹
            </button>
          ) : null}
          {photos[openIndex].isPanorama ? (
            // Dragging inside the panorama viewer to look around is itself a
            // sequence of mouse/touch events on this element — without
            // stopping propagation here, every one of them bubbles up to the
            // backdrop's onClick above and immediately closes the lightbox
            // again, exactly like the plain <img> below already guards against.
            <div
              className="h-full w-full max-h-[90vh] max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <PanoramaViewer
                url={`/api/media/${photos[openIndex].storageKey}`}
                mode="interactive"
                className="h-full w-full"
                key={photos[openIndex].id}
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object
            <img
              src={`/api/media/${photos[openIndex].storageKey}`}
              alt={photos[openIndex].caption ?? ""}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {photos.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
              }}
              aria-label="Nächstes Bild"
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/40 text-2xl text-white transition-colors hover:bg-white/60"
            >
              ›
            </button>
          ) : null}
          <div className="absolute bottom-4 text-sm text-white/80">
            {openIndex + 1} / {photos.length}
          </div>
        </div>
      ) : null}
    </div>
  );
}
