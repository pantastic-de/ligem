# Deployment

How to install LiGem on a server. Most of the stack runs via Docker Compose
(Next.js app + Valkey + Meilisearch + MinIO), so there is no separate
language/runtime setup needed for those — only Docker. **PostgreSQL/PostGIS
is the one exception**: production connects to a native install on the
server itself rather than the Dockerized `postgres` service dev uses (see
step 2) — manage its backups/upgrades at the OS level like any other
production database.

## Prerequisites

- A server (Linux) with **Docker** and the **Docker Compose plugin** installed
  (`docker compose version` should work).
- A domain name pointed at the server's IP address (for TLS/HTTPS via a
  reverse proxy — see below).
- Ports 80 and 443 open (for the reverse proxy). The app itself listens on
  3000 internally; Postgres/Valkey/Meilisearch/MinIO are bound to
  `127.0.0.1` only in `docker-compose.yml` and are not meant to be exposed
  directly to the internet.

## 1. Get the code onto the server

```bash
git clone <your-github-repo-url> ligem
cd ligem
```

(See `scripts/github-init.sh` for pushing this repo to GitHub in the first
place, if you haven't already.)

## 2. Set up native PostgreSQL/PostGIS

Production deliberately does **not** use the Dockerized `postgres` service
from `docker-compose.yml` (that one is dev-only, for a zero-setup local
experience) — it connects to a PostgreSQL/PostGIS instance installed directly
on the server instead. This avoids running the database's storage inside a
container on a machine where you'd rather manage backups/upgrades at the OS
level.

1. Install PostgreSQL and the PostGIS extension package for it via your
   distro's package manager (e.g. on Debian/Ubuntu:
   `apt install postgresql postgresql-<version>-postgis-3`).
2. Create the database/user the app will use, and enable PostGIS in that
   database:
   ```bash
   sudo -u postgres psql -c "CREATE USER ligem WITH PASSWORD '<strong password>';"
   sudo -u postgres psql -c "CREATE DATABASE ligem OWNER ligem;"
   sudo -u postgres psql -d ligem -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```
3. Make it reachable from the `web` container. The `web` service in
   `docker-compose.prod.yml` is configured with
   `extra_hosts: ["host.docker.internal:host-gateway"]`, so from inside the
   container the host is reachable as `host.docker.internal` — but Postgres
   itself needs to accept that connection:
   - `postgresql.conf`: `listen_addresses = '*'` (or specifically the Docker
     bridge gateway IP, if you'd rather not listen on all interfaces).
   - `pg_hba.conf`: allow the Docker network's subnet, e.g. (find the actual
     subnet via `docker network inspect ligem_default | grep -A2 IPAM`):
     ```
     host    ligem    ligem    172.20.0.0/16    scram-sha-256
     ```
   - `sudo systemctl reload postgresql` to apply.

## 3. Configure secrets

Create a root `.env` (this file is gitignored — never commit it):

```bash
DATABASE_URL=postgresql://ligem:<strong password>@host.docker.internal:5432/ligem
POSTGRES_PASSWORD=<unused in production, but keep set to something — see note below>
MEILI_MASTER_KEY=<generate a strong key>
MINIO_ROOT_USER=<choose a username>
MINIO_ROOT_PASSWORD=<generate a strong password>
AUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`DATABASE_URL` must use the user/database/password from step 2, and the host
must be `host.docker.internal` (not `localhost` — from inside the `web`
container, `localhost` refers to the container itself, not the server).

`POSTGRES_PASSWORD` is only read by the Dockerized `postgres` service, which
production never starts (see step 4) — it's still referenced by the shared
base `docker-compose.yml`, so Compose needs *some* value present to not warn
about a missing variable, but its actual value doesn't matter in production.

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` can stay empty — Google login is
simply not offered until both are set (see `src/lib/auth.ts`).

**Never reuse the values from local development.** Generate fresh secrets for
the server.

## 4. Run the app in production mode

The default `docker-compose.yml` runs `pnpm dev` for local development and
defines a Dockerized `postgres` service. `docker-compose.prod.yml` (committed
in the repo) overrides `web` to build and run in production mode instead, and
points it at the native PostgreSQL from step 2 rather than the `postgres`
service. Start everything, **explicitly excluding `postgres`** so it's never
started in production:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build web valkey meilisearch minio
```

`scripts/deploy.sh` already does this (see step 7).

## 5. Migrations (and, optionally, the seed)

`docker-compose.prod.yml`'s `web` command already runs `prisma migrate
deploy` itself — right after a successful `next build`, right before `pnpm
start` — so migrations apply automatically on every container start/restart,
including every deploy via `scripts/deploy.sh`. You don't need to run it by
hand as a separate step. If you ever do want to trigger it manually (e.g. to
apply a migration without restarting the app):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T web sh -c "pnpm exec prisma migrate deploy"
```

(No `cd apps/web` needed — the `web` service's `working_dir` is already
`/workspace/apps/web`, see `docker-compose.yml`.)

`migrate deploy` (not `migrate dev`) applies existing migrations without
prompting or generating new ones — the right command for production — and is
idempotent, so running it again when nothing's pending is a harmless no-op.

The seed script (`pnpm db:seed`) fills in the listing-taxonomy categories and
filter-attribute groups (Projekt Typ, Grundwerte, ...), which the app expects
to exist for the "Projekt eintragen" form to render properly:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -e NODE_ENV=production web sh -c "pnpm exec prisma db seed"
```

Setting `NODE_ENV=production` here matters: the seed script skips creating
its fixed-password local dev admin account when `NODE_ENV=production` (see
`prisma/seed.ts`). To get your first admin in production, register a normal
account through the site, then promote it directly in the database:

```bash
sudo -u postgres psql -d <your db> -c \
  "INSERT INTO \"UserRoleAssignment\" (id, \"userId\", role, \"createdAt\") \
   SELECT gen_random_uuid()::text, id, 'ADMIN', now() FROM \"User\" WHERE email = 'you@example.com';"
```

(Run this directly on the server against the native PostgreSQL — there is no
`postgres` container in production to `docker compose exec` into.)

## 6. Put a reverse proxy with TLS in front

The `web` container listens on port 3000 but isn't exposed with TLS itself.
The simplest option is [Caddy](https://caddyserver.com/), which gets
Let's Encrypt certificates automatically. Example `Caddyfile`:

```
ligem.de {
    reverse_proxy localhost:3000
}
```

Run Caddy directly on the host (or as another container on the same Docker
network, proxying to `web:3000`). Nginx + certbot works equally well if
that's already your standard setup.

## 7. Updating

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build web valkey meilisearch minio
```

Migrations run automatically as part of `web`'s own start command (see step
5) — no separate migrate step needed here.

(Or just run `scripts/deploy.sh`, which wraps exactly this over SSH, plus a
readiness check that waits for the app to actually answer before reporting
success — see the comment header in that file for why that check matters.)

## 8. Backups

- **Database:**
  ```bash
  pg_dump -U <your db user> <your db> > backup-$(date +%F).sql
  ```
  (run natively on the server, not via `docker compose exec` — there is no
  `postgres` container in production)
- **Uploaded files (MinIO):** back up the `minio_data` Docker volume (holds
  photos/documents attached to listings, once media upload is wired up).

## Automated deploy

`scripts/deploy.sh` wraps step 7 above over SSH, for redeploying after a
`git push`. See the comment header in that file for required environment
variables (`scripts/deploy.env` is a gitignored template you can `source`
before running it) — it is never run automatically by Claude, since that
means connecting to and modifying a real production server.

**Note on `git reset --hard`:** the script does this to guarantee the server
matches `origin` exactly. That means any *uncommitted* local edits to tracked
files (e.g. hand-editing `docker-compose.prod.yml` directly on the server)
are silently discarded on the next deploy. If you need a server-specific
override, commit it (as this file's native-Postgres settings now are) rather
than editing it only on the server.
