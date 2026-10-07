"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_FILES = 12; // matches MAX_NEW_EVENT_PHOTOS in termine/actions.ts
const MAX_FILE_BYTES = 8 * 1024 * 1024; // MAX_IMAGE_SIZE in src/lib/media.ts
// The whole form is one Server Action request (50 MB limit, next.config.ts),
// so the photos together must stay below that with room for the other fields.
const MAX_TOTAL_BYTES = 45 * 1024 * 1024;

type Picked = { file: File; url: string };

/**
 * Photo selection for the "Neuer Termin" form: pick several images (in one
 * or several rounds), see previews, remove single ones. The chosen files are
 * kept in a hidden `<input type="file" name="photos" multiple>` (filled via
 * DataTransfer), so the surrounding plain `<form action={createEvent}>`
 * submits them like any other field. More photos, 360° images and videos
 * can be added on the edit page afterwards.
 */
export function EventPhotoPicker() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const chooserRef = useRef<HTMLInputElement>(null);

  // Keep the named form input in sync with the current selection.
  useEffect(() => {
    if (!formInputRef.current) return;
    const transfer = new DataTransfer();
    for (const p of picked) transfer.items.add(p.file);
    formInputRef.current.files = transfer.files;
  }, [picked]);

  // Release preview URLs when the component goes away.
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const notes: string[] = [];
    const next = [...picked];
    let total = next.reduce((sum, p) => sum + p.file.size, 0);
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) {
        notes.push(`„${file.name}“ ist kein Bild.`);
      } else if (file.size > MAX_FILE_BYTES) {
        notes.push(`„${file.name}“ ist größer als 8 MB.`);
      } else if (next.length >= MAX_FILES) {
        notes.push(`Beim Anlegen gehen höchstens ${MAX_FILES} Fotos, weitere kannst du danach beim Bearbeiten hinzufügen.`);
        break;
      } else if (total + file.size > MAX_TOTAL_BYTES) {
        notes.push("Zusammen sind die Fotos zu groß. Weitere kannst du danach beim Bearbeiten hinzufügen.");
        break;
      } else {
        next.push({ file, url: URL.createObjectURL(file) });
        total += file.size;
      }
    }
    setPicked(next);
    setMessage(notes.length ? notes.join(" ") : null);
    if (chooserRef.current) chooserRef.current.value = "";
  }

  function remove(index: number) {
    URL.revokeObjectURL(picked[index].url);
    setPicked(picked.filter((_, i) => i !== index));
    setMessage(null);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-medium">
        Fotos <span className="font-normal text-text-muted">(optional)</span>
      </legend>
      <p className="text-sm text-text-muted">
        Mehrere Bilder möglich, bis 8 MB pro Foto. Das erste Foto wird das Vorschaubild. Rundum-Panoramen (2:1) werden
        automatisch als 360°-Bild erkannt. Bei einer Wiederholung gelten die Fotos für alle Termine der Serie.
      </p>

      {picked.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {picked.map((p, i) => (
            <li key={p.url} className="relative overflow-hidden rounded-xl border border-text/10 bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.file.name} className="aspect-[4/3] w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                  Vorschau
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`${p.file.name} entfernen`}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-text shadow-sm transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => chooserRef.current?.click()}
        className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-text/20 bg-surface px-5 font-semibold text-primary transition-colors hover:border-primary/50"
      >
        <ImagePlus className="h-5 w-5" aria-hidden="true" />
        {picked.length > 0 ? "Weitere Fotos hinzufügen" : "Fotos auswählen"}
      </button>
      {/* Unnamed chooser; the selection is copied into the named input below. */}
      <input
        ref={chooserRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => addFiles(e.target.files)}
      />
      <input ref={formInputRef} type="file" name="photos" multiple className="hidden" aria-hidden="true" tabIndex={-1} />

      {message ? (
        <p role="status" className="rounded-xl bg-warning/10 px-4 py-2 text-sm text-warning">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
