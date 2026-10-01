/**
 * One-time move of every uploaded file from the former MinIO bucket
 * ("ligem-media") into MEDIA_DIR, where src/lib/storage.ts now reads them
 * from. Keys stay identical, so no database row changes. Safe to re-run:
 * files already present with the same size are skipped.
 *
 * Needs the old MinIO container running (`--profile legacy`, see
 * DEPLOYMENT.md) and the S3_* variables docker-compose.yml still passes in:
 *   docker compose exec web sh -c "cd /workspace/apps/web && pnpm exec tsx scripts/migrate-minio-to-local.ts"
 *
 * Once every server has been migrated, this script, the `minio` dependency
 * and the legacy service/env vars can be removed.
 */
import { Client } from "minio";

import { putObject, statObject } from "../src/lib/storage";

const BUCKET = "ligem-media";
const endpoint = new URL(process.env.S3_ENDPOINT ?? "http://minio:9000");
const client = new Client({
  endPoint: endpoint.hostname,
  port: endpoint.port ? Number(endpoint.port) : undefined,
  useSSL: endpoint.protocol === "https:",
  accessKey: process.env.S3_ACCESS_KEY ?? "",
  secretKey: process.env.S3_SECRET_KEY ?? "",
});

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

async function main() {
  if (!(await client.bucketExists(BUCKET))) {
    console.log(`Bucket "${BUCKET}" existiert nicht, nichts zu tun.`);
    return;
  }

  const keys: { name: string; size: number }[] = [];
  for await (const item of client.listObjectsV2(BUCKET, "", true)) {
    if (item.name) keys.push({ name: item.name, size: item.size });
  }
  console.log(`${keys.length} Dateien im Bucket gefunden.`);

  let copied = 0;
  let skipped = 0;
  const failed: string[] = [];
  for (const [i, { name, size }] of keys.entries()) {
    try {
      const existing = await statObject(name);
      if (existing?.size === size) {
        skipped++;
        continue;
      }
      await putObject(name, await readAll(await client.getObject(BUCKET, name)));
      copied++;
    } catch (err) {
      failed.push(`${name}: ${(err as Error).message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${keys.length}`);
  }

  console.log(`Fertig: ${copied} kopiert, ${skipped} schon vorhanden, ${failed.length} fehlgeschlagen.`);
  for (const line of failed) console.log(`  FEHLER ${line}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
