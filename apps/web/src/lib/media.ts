import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { putObject } from "@/lib/storage";

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB pro Bild

const DISPLAY_MAX_WIDTH = 1600;
const THUMBNAIL_MAX_WIDTH = 400;

export function splitBySize(files: File[]): { valid: File[]; oversizedCount: number } {
  const valid = files.filter((f) => f.size <= MAX_IMAGE_SIZE);
  return { valid, oversizedCount: files.length - valid.length };
}

const PANORAMA_ASPECT_RATIO = 2;
const PANORAMA_ASPECT_RATIO_TOLERANCE = 0.05; // allow ~5% deviation from a perfect 2:1

/**
 * Checks whether an uploaded image is close enough to the 2:1 aspect ratio
 * that equirectangular 360° panoramas require. Returns false (rather than
 * throwing) for anything unreadable, so the caller can show a plain "wrong
 * format" error instead of a crash.
 */
export async function isPanoramaAspectRatio(file: File): Promise<boolean> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height) return false;
    const ratio = width / height;
    return Math.abs(ratio - PANORAMA_ASPECT_RATIO) <= PANORAMA_ASPECT_RATIO_TOLERANCE;
  } catch {
    return false;
  }
}

/**
 * Resizes an uploaded image into a display version (max 1600px wide) and a
 * thumbnail (max 400px wide), uploads both to MinIO under `keyPrefix`, and
 * returns their object keys. Returns null if the file isn't a readable image
 * (skip it rather than fail the whole upload).
 */
export async function processAndStoreImage(
  file: File,
  keyPrefix: string,
): Promise<{ storageKey: string; thumbnailKey: string } | null> {
  const original = Buffer.from(await file.arrayBuffer());

  let display: Buffer;
  let thumbnail: Buffer;
  try {
    display = await sharp(original)
      .rotate()
      .resize({ width: DISPLAY_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    thumbnail = await sharp(original)
      .rotate()
      .resize({ width: THUMBNAIL_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
  } catch {
    return null;
  }

  const id = randomUUID();
  const storageKey = `${keyPrefix}/${id}-display.jpg`;
  const thumbnailKey = `${keyPrefix}/${id}-thumb.jpg`;

  await putObject(storageKey, display, "image/jpeg");
  await putObject(thumbnailKey, thumbnail, "image/jpeg");

  return { storageKey, thumbnailKey };
}
