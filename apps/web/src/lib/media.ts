import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { putObject } from "@/lib/storage";

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB pro Bild
export const MAX_PANORAMA_SIZE = 12 * 1024 * 1024; // 12MB pro 360°-Bild — equirektangulare Panoramen sind oft hochauflösender als normale Fotos
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB pro Video

const DISPLAY_MAX_WIDTH = 1600;
const THUMBNAIL_MAX_WIDTH = 400;

const VIDEO_EXTENSION_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
};

export function isAllowedVideoType(file: File): boolean {
  return file.type in VIDEO_EXTENSION_BY_TYPE;
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

const MAX_VIDEO_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB — sanity cap on the client-generated poster frame

/**
 * Stores an uploaded video as-is (no server-side transcoding/resizing —
 * that would need ffmpeg, a new system dependency not otherwise required by
 * this app). `thumbnail`, when given, is a poster-frame JPEG captured
 * client-side (see extractVideoThumbnail in video-upload-form.tsx, which
 * grabs a frame via a hidden <video>/<canvas> in the browser before
 * upload) and is stored alongside the video as its thumbnailKey — exactly
 * like a photo's thumbnail, so the gallery can render it the same way.
 * A missing or implausibly large thumbnail (tampered client, capture
 * failure) is simply skipped rather than stored — the gallery already
 * falls back to a placeholder tile when thumbnailKey is null.
 */
export async function storeVideo(
  file: File,
  keyPrefix: string,
  thumbnail?: File | null,
): Promise<{ storageKey: string; thumbnailKey: string | null }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = VIDEO_EXTENSION_BY_TYPE[file.type] ?? "mp4";
  const id = randomUUID();
  const storageKey = `${keyPrefix}/${id}-video.${extension}`;
  await putObject(storageKey, buffer, file.type || "video/mp4");

  let thumbnailKey: string | null = null;
  if (thumbnail && thumbnail.size > 0 && thumbnail.size <= MAX_VIDEO_THUMBNAIL_SIZE) {
    thumbnailKey = `${keyPrefix}/${id}-video-thumb.jpg`;
    await putObject(thumbnailKey, Buffer.from(await thumbnail.arrayBuffer()), "image/jpeg");
  }

  return { storageKey, thumbnailKey };
}

/**
 * Resizes and stores a standalone thumbnail image with no accompanying
 * "original" — used for a video-link's fetched provider thumbnail (see
 * fetchVideoLinkThumbnail in src/lib/video-link.ts), where the actual video
 * itself never touches MinIO at all (its storageKey is the external
 * embeddable URL, not an object key). Returns null on anything unreadable
 * rather than throwing, since a missing thumbnail just falls back to the
 * gallery's placeholder tile.
 */
export async function storeThumbnailOnly(buffer: Buffer, keyPrefix: string): Promise<string | null> {
  try {
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize({ width: THUMBNAIL_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    const thumbnailKey = `${keyPrefix}/${randomUUID()}-video-thumb.jpg`;
    await putObject(thumbnailKey, thumbnail, "image/jpeg");
    return thumbnailKey;
  } catch {
    return null;
  }
}

const AVATAR_SIZE = 256;

/**
 * Resizes an uploaded profile picture into a fixed 256×256 square (cropped
 * to fill, not letterboxed — matches how avatars are conventionally
 * displayed everywhere, unlike gallery photos which keep their own aspect
 * ratio) and stores it under `users/<userId>/`. Returns null for anything
 * unreadable, same fail-soft convention as the other store* helpers here.
 */
export async function storeAvatar(file: File, userId: string): Promise<string | null> {
  try {
    const original = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(original)
      .rotate()
      .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();
    const key = `users/${userId}/${randomUUID()}-avatar.jpg`;
    await putObject(key, resized, "image/jpeg");
    return key;
  } catch {
    return null;
  }
}
