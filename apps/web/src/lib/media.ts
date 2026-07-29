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
