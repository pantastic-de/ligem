import { Client } from "minio";

const endpoint = new URL(process.env.S3_ENDPOINT ?? "http://minio:9000");

export const minioClient = new Client({
  endPoint: endpoint.hostname,
  port: endpoint.port ? Number(endpoint.port) : undefined,
  useSSL: endpoint.protocol === "https:",
  accessKey: process.env.S3_ACCESS_KEY ?? "",
  secretKey: process.env.S3_SECRET_KEY ?? "",
});

export const MEDIA_BUCKET = "ligem-media";

let bucketReady: Promise<void> | null = null;

export function ensureMediaBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const exists = await minioClient.bucketExists(MEDIA_BUCKET).catch(() => false);
      if (!exists) {
        await minioClient.makeBucket(MEDIA_BUCKET);
      }
    })();
  }
  return bucketReady;
}

export async function putObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await ensureMediaBucket();
  await minioClient.putObject(MEDIA_BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
}

// Returns a Node Readable stream for the whole object, or — when `range` is
// given — just the requested byte range via MinIO's getPartialObject. Used
// by the /api/media proxy so large files (notably videos, up to 200MB) are
// streamed straight through rather than buffered fully into memory, and so
// <video> playback can seek via HTTP Range requests instead of always
// downloading the entire file.
export async function getObjectStream(
  key: string,
  range?: { start: number; end: number },
) {
  if (range) {
    return minioClient.getPartialObject(MEDIA_BUCKET, key, range.start, range.end - range.start + 1);
  }
  return minioClient.getObject(MEDIA_BUCKET, key);
}

export async function deleteObject(key: string): Promise<void> {
  await minioClient.removeObject(MEDIA_BUCKET, key).catch(() => undefined);
}
