# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Leben in Gemeinschaft" (ligem, homepage: ligem.de) is a free, common-good-oriented (gemeinwohlorientiert) international platform for all forms of communal living (WGs, Ökodörfer, Co-Housing, Mehrgenerationenhäuser, etc. — not limited to classic WGs). It serves four audiences at once: (1) housing communities presenting themselves / looking for new members, (2) common-good organizations working on communal-living topics, (3) people just informing themselves about communal living (regardless of search intent), (4) organizations/communities posting events, info sessions, or visiting days to a shared calendar. Deliberately **not** styled as spiritual/esoteric, even though a large part of the target audience personally is — tone and design stay neutral/grounded (see the `warm-community-design` skill under `.claude/skills/`).

Key product decisions (from the founder's requirements questionnaire, kept in memory for full detail):
- No automated matching — users only search/filter themselves.
- Listing taxonomy (room, whole unit, project founding, temporary stays, ...) is a freely extensible DB table, not hardcoded; a listing can belong to multiple categories.
- Required fields per listing are deliberately minimal (project name + owner); the long list of possible filters (location, lifestyle, values, decision model, ecology, ...) is explicitly a later expansion, not MVP scope.
- Guest access without login, moderation/approval before publishing, contact details revealed only after the listing owner approves.
- Multi-language content is planned (start: German + English).

Note: the founder's questionnaire originally listed Laravel as a tech preference, but the user has confirmed (2026-07-27) that the project stays on the existing Next.js/React/TypeScript stack below — no migration planned.

The Next.js app has a real domain data model (Prisma schema + migration applied) and a first vertical slice of UI: registration/login, submitting a listing, browsing published listings, and contacting a listing owner (see Pages below).

## Architecture

- Monorepo layout: the Next.js app lives in `apps/web`; the repo root only holds Docker/infra config. There is a root `pnpm-workspace.yaml`-style setup but currently a single app package.
- `docker-compose.yml` at the repo root defines the full dev stack:
  - `postgres` — PostGIS-enabled Postgres (user `c1u3`, db `c1db3` — the actual initialized credentials in the `postgres_data` volume; `DATABASE_URL` must match these, not a nicer-looking placeholder)
  - `valkey` — Redis-compatible cache/queue store
  - `meilisearch` — search engine (likely for searching WGs/orgs/listings)
  - `minio` — S3-compatible object storage (photos/videos/documents on listings)
  - `web` — runs the Next.js app itself via `pnpm dev` inside a `node:22-bookworm` container, with `DATABASE_URL`, `REDIS_URL`, `MEILISEARCH_HOST`/`MEILISEARCH_KEY`, `S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` wired in as env vars
- Secrets/config for the compose stack come from a root `.env` (gitignored): `POSTGRES_PASSWORD`, `MEILI_MASTER_KEY`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Google OAuth is optional — the provider is only registered in `src/lib/auth.ts` when both are set).
- `apps/web` is a standard Next.js App Router project (TypeScript, React 19, Tailwind CSS v4, ESLint 9 flat config). Source lives under `apps/web/src/app`. Path alias `@/*` maps to `apps/web/src/*`.
- **Running commands inside the container vs. on the host is not interchangeable here.** `node_modules` was first installed by the `web` container (pnpm store path `/workspace/.pnpm-store/v11`); running `pnpm` from the host fails with `ERR_PNPM_UNEXPECTED_STORE` because the bind-mounted path resolves differently. Run `pnpm`/`prisma` commands via `docker compose exec web sh -c "cd /workspace/apps/web && <cmd>"` unless you've set up a separate host-side store.

## Data model (Prisma)

- Schema: `apps/web/prisma/schema.prisma`. Config (datasource URL, migrations path, seed command) lives in `apps/web/prisma.config.ts`, **not** in the schema file — this is Prisma 7, which moved connection handling to driver adapters (see below) and dropped `datasource.url` from `schema.prisma`.
- Client generation: `generator client { provider = "prisma-client" }` generates plain TypeScript (not the old `prisma-client-js`) into `apps/web/src/generated/prisma/` (gitignored, regenerated via `prisma generate`, wired into `postinstall`). Import from `@/generated/prisma/client` (or `../src/generated/prisma/client` from `prisma/seed.ts`) — there is no barrel `index`.
- Prisma 7 requires an explicit driver adapter at runtime: `apps/web/src/lib/prisma.ts` builds a `PrismaClient` with `@prisma/adapter-pg` (`pg` driver), not a bare `new PrismaClient()`. Reuse that shared instance instead of instantiating a new client per file.
- PostGIS: enabled via `previewFeatures = ["postgresqlExtensions"]` and `extensions = [postgis]` on the datasource. Location columns (`Listing.location`, `Event.location`) are typed `Unsupported("geometry(Point, 4326)")` — Prisma Client can't read/write them directly, use `$queryRaw`/`$executeRaw` for anything geo (distance search, map clustering).
- Domain shape (full rationale in project memory — `ligem_positioning`, `ligem_roles_and_content_model`, `ligem_trust_legal_business`, `ligem_tech_and_design`):
  - **Auth**: `User`/`Account`/`Session`/`VerificationToken` follow the Auth.js Prisma-adapter shape. `UserRoleAssignment` lets one user hold several of `SUCHENDE`/`ANBIETER`/`MODERATOR`/`ADMIN` at once (no fixed role).
  - **Organizations** own multiple `Listing`s/`Event`s (Vereine/Genossenschaften as first-class actors, not just users).
  - **Listing** taxonomy (the "Art des Projektinserates" — Zimmer, ganze Einheit, ...) is DB-backed and many-to-many (`ListingCategory` + `ListingCategoryAssignment`), not a hardcoded enum. Only `projectName` + `createdBy` are required; everything else (Standort, Ansprechperson, Gruppengröße, Kosten, Suchzeitraum, ...) is optional real columns on `Listing`.
  - **Generic filter-attribute system**: `AttributeGroup` + `AttributeOption` + `ListingAttributeOption` is a second, more general extensible-taxonomy mechanism sitting alongside `ListingCategory` — it covers Projekt Typ, Projekt Status, Geschlechterverteilung, Organisationsform, Gemeinschaftsbereiche, Grundwerte, Wohnlage, Zielgruppe. `AttributeGroup.allowMultiple` is a UI hint only (radio vs. checkboxes in the form) — the underlying relation is many-to-many either way, so new filter values (or whole new filter groups) are just rows, managed from `/admin/attribute`, never a migration. There is no more free-form `Listing.attributes` JSON column — it was removed once this system replaced it.
  - No matching engine anywhere in the schema — `SavedSearch.filters` is just a stored filter set for the user's own search UI (not built yet).
  - `ContactRequest` (contact form, not chat) only reveals the listing owner's contact info once `status` flips to `ACCEPTED`. `Appointment` is separate (Besichtigungstermin scheduling, not built yet). `Event` is the public calendar (Veranstaltungen/Besuchstage) — listing owners manage their own `Event`s under `/projekte/[id]/termine`.
  - `Report` covers abuse reports across listings/events/orgs/users; there's deliberately no ban-history/audit subsystem, matching the "lightweight trust & safety" decision.
- Prisma also installed its own AI-agent skills under `apps/web/.claude/skills/prisma-*` (from `prisma init`) — check those for Prisma-7-specific syntax (driver adapters, config file shape) before assuming Prisma 5/6 patterns from training data.

## Authentication & authorization

`src/lib/auth.ts` configures Auth.js (`next-auth@5`) with `PrismaAdapter`, JWT sessions (required because of the Credentials provider), a `Credentials` provider (email + bcrypt-hashed password against `User.passwordHash`), and an optional `Google` provider gated on `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` being set. Route handler: `src/app/api/auth/[...nextauth]/route.ts`.
- `callbacks.jwt`/`callbacks.session` copy the user id onto `session.user.id` (not there by default with JWT sessions) — the type augmentation for this lives in `src/types/next-auth.d.ts`. Any code reading `session.user.id` depends on both files staying in sync.
- `src/components/site-header.tsx` is a server component that calls `auth()` directly, shows the "Admin" nav link only when `isAdmin()` is true, and renders a sign-out `<form>` whose action calls the exported `signOut`.
- `src/lib/authz.ts` has the admin-role check (`isAdmin(userId)`, checking `UserRoleAssignment` for `ADMIN`) plus `requireAdminPage()`/`requireAdminAction()` — every `/admin/*` page and every admin server action calls one of these; the page-level check alone is not enough since actions can be invoked directly.
- Ownership checks for listings/events are simpler: compare `session.user.id` to `Listing.createdById` directly (see `/projekte/[id]/bearbeiten` and `/projekte/[id]/termine/*`) — there's no multi-manager-per-listing concept yet, just a single owner.

## Pages

All forms follow the same convention: a server-component page with a plain `<form action={serverAction}>` (no client JS/`useActionState`), where the action is a `"use server"` function in a sibling `actions.ts` that validates, mutates via Prisma, and calls `redirect()` — errors redirect back to the same page with an `?error=...` query param the page reads server-side. This works without JavaScript and keeps forms accessible; follow the same pattern for new forms rather than introducing client-side form state. The large "Projekt eintragen"/"Projekt bearbeiten" field set is factored into the shared `src/components/listing-form-fields.tsx` so create and edit stay in sync — extend that component, not one page's copy of it, when adding a field.

- `/` — homepage (hero + the four target-audience cards); logo at `public/logo.png`, shown via `mix-blend-multiply` in `SiteHeader` to drop its white background against the warm `--color-bg`
- `/registrieren`, `/anmelden` — registration (optional Suchende/Anbieter role checkboxes) and login (Credentials + optional Google); see `actions.ts` in each folder
- `/projekte` — public list of `PUBLISHED` listings
- `/projekte/neu` — create-listing form (requires session); always creates with `status: PENDING_REVIEW`
- `/projekte/[id]` — listing detail; non-owners only see it once `PUBLISHED` (else `notFound()`), owners can always see their own regardless of status. Shows upcoming `Event`s, a `ContactRequest` form to non-owners on published listings, and (for the owner) "Projekt bearbeiten"/"Termine verwalten" links
- `/projekte/[id]/bearbeiten` — edit form for the listing's owner only; saving resets status back to `PENDING_REVIEW` (edits get re-moderated too)
- `/projekte/[id]/termine`, `/termine/neu`, `/termine/[eventId]/bearbeiten` — Event CRUD scoped to the listing's owner; events are created as `PUBLISHED` directly (no separate moderation queue for events)
- `/meine-projekte` — the logged-in user's own listings with status labels
- `/admin`, `/admin/nutzer`, `/admin/kategorien`, `/admin/attribute` — ADMIN-only (see Authentication & authorization above): assign roles, manage `ListingCategory` rows, manage `AttributeGroup`/`AttributeOption` rows
- `/hilfe` and subpages — user-facing help content describing the above; keep in sync when features change, since it documents actual behavior rather than aspirational scope
- `/impressum`, `/datenschutz`, `/agb` — legal pages using the operator's real contact details (see `impressum/page.tsx`); Datenschutz/AGB carry an explicit "this is a draft, not legal advice" banner and must be reviewed by a lawyer before real launch

Approving/rejecting submitted listings is still DB-only (no moderation queue UI yet — flip `Listing.status` by hand, e.g. via `pnpm db:studio`). Not built yet: media upload (MinIO wiring), search/map, Besichtigungstermin (`Appointment`) UI, `SavedSearch` UI, and i18n.

## Deployment

See `DEPLOYMENT.md` for server installation (Docker Compose in production mode, migrations, reverse proxy/TLS, backups) and `scripts/deploy.sh`/`scripts/github-init.sh` for the corresponding automation — both scripts are written but intentionally never executed by Claude, since they push to a real GitHub remote / deploy to a real server. `prisma/seed.ts` skips creating its fixed-password local dev admin when `NODE_ENV=production`.

## Commands

Run everything via Docker (starts Postgres/Valkey/Meilisearch/MinIO and the Next.js dev server together):
```bash
docker compose up
```
The app is then served at http://localhost:3000, with dependent services bound to 127.0.0.1 on their default ports (Postgres 5432, Valkey 6379, Meilisearch 7700, MinIO 9000/9001).

Run app/package commands inside the running container (see the host-vs-container note above):
```bash
docker compose exec web sh -c "cd /workspace/apps/web && <command>"
```
Common commands:
```bash
pnpm dev             # dev server on 0.0.0.0:3000 (already running via docker compose up)
pnpm build           # production build
pnpm lint            # eslint
pnpm exec tsc --noEmit   # type-check only

pnpm db:migrate      # prisma migrate dev — create/apply a migration from schema changes
pnpm db:seed         # prisma db seed — runs prisma/seed.ts (categories, attribute groups, and — outside NODE_ENV=production — a dev admin login)
pnpm db:studio       # prisma studio — browse the dev database
pnpm exec prisma generate   # regenerate the client into src/generated/prisma (also runs on postinstall)
```
Note: `apps/web/.env` holds a host-reachable `DATABASE_URL` (`localhost:5432`) for any tooling invoked from outside Docker; inside the `web` container, `docker-compose.yml`'s `environment:` block (hostname `postgres`) takes precedence over `.env` — both point at the same `c1u3`/`c1db3` database.

There is no test setup yet.
