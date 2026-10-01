import { createReadStream } from "node:fs";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Uploaded media (photos, panoramas, videos, thumbnails, avatars) live as
// plain files under MEDIA_DIR — a Docker volume (`media_data`, see
// docker-compose.yml) — rather than in an S3/MinIO bucket. This app runs as
// a single server, so a separate object-storage service added nothing but
// one more container (and the MinIO image is no longer published). Keys
// keep the same shape as the former MinIO object keys
// (`listings/<id>/<uuid>-display.jpg`, ...), so Media rows needed no change
// when existing files were copied over (October 2026).
const MEDIA_ROOT = path.resolve(process.env.MEDIA_DIR ?? "/data/media");

// The file's type comes from its extension: every key this app writes ends
// in one (see src/lib/media.ts), and an unknown one is served as a plain
// download rather than guessed.
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg",
};

/**
 * Maps a storage key to its absolute file path, or null for anything that
 * could escape MEDIA_ROOT. Keys reach this from the public /api/media/<key>
 * URL, so this is the path-traversal guard: no absolute paths, no `..`
 * segments, no NUL bytes, and the resolved path must still sit inside the
 * root.
 */
function filePathFor(key: string): string | null {
  if (!key || key.includes("\0") || path.isAbsolute(key)) return null;
  if (key.split(/[\\/]/).some((segment) => segment === ".." || segment === "")) return null;
  const resolved = path.resolve(MEDIA_ROOT, key);
  return resolved.startsWith(MEDIA_ROOT + path.sep) ? resolved : null;
}

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPE_BY_EXTENSION[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

// No content type is stored: it's derived from the key's extension when
// serving (contentTypeForKey).
export async function putObject(key: string, buffer: Buffer): Promise<void> {
  const filePath = filePathFor(key);
  if (!filePath) throw new Error(`Ungültiger Speicherschlüssel: ${key}`);
  await mkdir(path.dirname(filePath), { recursive: true });
  // Write to a temp file first and rename it into place, so a request for
  // this key never sees a half-written file.
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tmpPath, buffer);
  await rename(tmpPath, filePath);
}

/** Size of a stored file, or null if the key is invalid or doesn't exist. */
export async function statObject(key: string): Promise<{ size: number } | null> {
  const filePath = filePathFor(key);
  if (!filePath) return null;
  try {
    const info = await stat(filePath);
    return info.isFile() ? { size: info.size } : null;
  } catch {
    return null;
  }
}

// Streams the whole file, or just `range` (inclusive byte offsets), so the
// /api/media route can serve large videos without buffering them and answer
// HTTP Range requests for <video> seeking. Callers check existence via
// statObject first.
export function getObjectStream(key: string, range?: { start: number; end: number }) {
  const filePath = filePathFor(key);
  if (!filePath) throw new Error(`Ungültiger Speicherschlüssel: ${key}`);
  return createReadStream(filePath, range ? { start: range.start, end: range.end } : undefined);
}

export async function deleteObject(key: string): Promise<void> {
  const filePath = filePathFor(key);
  if (!filePath) return;
  await unlink(filePath).catch(() => undefined);
}
