"use client";

import { useRef, useState, useTransition } from "react";
import { PlayCircle, RotateCw, Video } from "lucide-react";

type MediaItem = {
  id: string;
  thumbnailKey: string | null;
  storageKey: string;
  caption: string | null;
  isPanorama?: boolean;
  isVideoLink?: boolean;
  type?: string;
};

/**
 * Photo grid used in the listing/event edit forms' "Fotos" section. Photos
 * can be reordered either by dragging a tile (desktop mouse) or via the
 * ←/→ buttons (touch/keyboard, since native HTML5 drag-and-drop barely
 * works on touchscreens) — both paths call the same `reorderAction`, a
 * Server Action bound to the listing/event id via `.bind()` at the call
 * site (see media-actions.ts/event-media-actions.ts), so this component
 * itself doesn't need to know which kind of parent it belongs to. Position
 * 0 is always the thumbnail shown on /projekte and /termine, hence the
 * "Vorschau" badge on the first tile.
 */
export function ReorderablePhotoGallery({
  media,
  reorderAction,
  deleteAction,
  hiddenFields,
}: {
  media: MediaItem[];
  reorderAction: (orderedIds: string[]) => Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
}) {
  const [items, setItems] = useState(media);
  const [, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    startTransition(() => {
      reorderAction(next.map((m) => m.id));
    });
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => {
            dragIndex.current = index;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const from = dragIndex.current;
            dragIndex.current = null;
            if (from === null) return;
            moveTo(from, index);
          }}
          className="flex cursor-grab flex-col gap-2 active:cursor-grabbing"
        >
          <div className="relative aspect-square overflow-hidden rounded-xl bg-bg">
            {item.type === "VIDEO" && !item.thumbnailKey ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-text/5 text-text-muted">
                <Video className="h-8 w-8" aria-hidden="true" />
                <span className="text-xs font-medium">{item.isVideoLink ? "Video-Link" : "Video"}</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object, not a static/optimizable asset
              <img
                src={`/api/media/${item.thumbnailKey ?? item.storageKey}`}
                alt={item.caption ?? ""}
                className="h-full w-full object-cover"
              />
            )}
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                Vorschau
              </span>
            ) : null}
            {item.isPanorama ? (
              <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                360°
              </span>
            ) : null}
            {item.type === "VIDEO" && item.thumbnailKey ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="h-8 w-8 text-white drop-shadow" aria-hidden="true" />
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveTo(index, index - 1)}
              disabled={index === 0}
              aria-label="Weiter nach vorne verschieben"
              className="min-h-9 flex-1 rounded-full border border-text/20 text-sm transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => moveTo(index, index + 1)}
              disabled={index === items.length - 1}
              aria-label="Weiter nach hinten verschieben"
              className="min-h-9 flex-1 rounded-full border border-text/20 text-sm transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
            >
              →
            </button>
          </div>

          <form action={deleteAction}>
            {Object.entries(hiddenFields).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <input type="hidden" name="mediaId" value={item.id} />
            <button
              type="submit"
              className="min-h-9 w-full rounded-full border border-error/40 text-sm font-medium text-error transition-colors hover:bg-error/10"
            >
              Entfernen
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
