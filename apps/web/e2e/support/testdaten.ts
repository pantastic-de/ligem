import { readFileSync } from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { Client } from "pg";

// Test data for the story tests. Everything carries the prefix `e2e-` (ids,
// slugs) and an address on `e2e.ligem.invalid`, so it can't collide with
// real or demo data, never receives mail (the app drops .invalid
// recipients) and can be removed completely afterwards.

export const PASSWORT = "e2e-Passwort-123";

export const NUTZER = {
  suchende: { id: "e2e-suchende", email: "mira@e2e.ligem.invalid", name: "Mira Suchend" },
  betreiberin: { id: "e2e-betreiberin", email: "jana@e2e.ligem.invalid", name: "Jana Hofmann" },
  admin: { id: "e2e-admin", email: "alex@e2e.ligem.invalid", name: "Alex Admin" },
} as const;

export const PROJEKTE = {
  sonnenhof: {
    id: "e2e-sonnenhof",
    slug: "e2e-sonnenhof-gemeinschaft",
    name: "E2E Sonnenhof Gemeinschaft",
    suchwort: "Sonnenhof",
  },
  wiesenweg: {
    id: "e2e-wiesenweg",
    slug: "e2e-wohnprojekt-wiesenweg",
    name: "E2E Wohnprojekt Wiesenweg",
  },
} as const;

/** DATABASE_URL from the environment, else from apps/web/.env (host port 5432). */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL fehlt (weder Umgebung noch apps/web/.env)");
  return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
}

export async function mitDatenbank<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Removes every trace of earlier runs. Projects first (their events point at them). */
export async function testdatenEntfernen(db: Client): Promise<void> {
  await db.query(`DELETE FROM "Event" WHERE "listingId" LIKE 'e2e-%'`);
  await db.query(`DELETE FROM "Listing" WHERE id LIKE 'e2e-%'`);
  await db.query(`DELETE FROM "User" WHERE id LIKE 'e2e-%'`);
}

export async function testdatenAnlegen(db: Client): Promise<void> {
  const hash = await bcrypt.hash(PASSWORT, 10);
  for (const user of Object.values(NUTZER)) {
    await db.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", "emailVerified", "notifyContactRequestsByEmail", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), true, now())`,
      [user.id, user.email, user.name, hash],
    );
  }
  await db.query(`INSERT INTO "UserRoleAssignment" (id, "userId", role) VALUES ('e2e-rolle-admin', $1, 'ADMIN')`, [
    NUTZER.admin.id,
  ]);

  const { sonnenhof, wiesenweg } = PROJEKTE;
  await db.query(
    `INSERT INTO "Listing" (id, slug, "projectName", motto, city, country, status, "createdById", "publishedAt", "updatedAt")
     VALUES ($1, $2, $3, 'Gemeinsam alt werden, mit großem Garten', 'Lindenfeld', 'Deutschland', 'PUBLISHED', $4, now(), now())`,
    [sonnenhof.id, sonnenhof.slug, sonnenhof.name, NUTZER.betreiberin.id],
  );
  await db.query(
    `INSERT INTO "Listing" (id, slug, "projectName", motto, city, country, status, "createdById", "updatedAt")
     VALUES ($1, $2, $3, 'Generationenwohnen am Ortsrand', 'Lindenfeld', 'Deutschland', 'PENDING_REVIEW', $4, now())`,
    [wiesenweg.id, wiesenweg.slug, wiesenweg.name, NUTZER.betreiberin.id],
  );
}
