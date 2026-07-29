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

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await minioClient.getObject(MEDIA_BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  await minioClient.removeObject(MEDIA_BUCKET, key).catch(() => undefined);
}
