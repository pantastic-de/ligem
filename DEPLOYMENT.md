# Deployment

How to install LiGem on a server. The project runs entirely via Docker
Compose (Next.js app + Postgres/PostGIS + Valkey + Meilisearch + MinIO), so
there is no separate language/runtime setup needed on the server — only
Docker.

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

## 2. Configure secrets

Create a root `.env` (this file is gitignored — never commit it):

```bash
POSTGRES_PASSWORD=<generate a strong password>
MEILI_MASTER_KEY=<generate a strong key>
MINIO_ROOT_USER=<choose a username>
MINIO_ROOT_PASSWORD=<generate a strong password>
AUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` can stay empty — Google login is
simply not offered until both are set (see `src/lib/auth.ts`).

**Never reuse the values from local development.** Generate fresh secrets for
the server.

## 3. Run the app in production mode

The default `docker-compose.yml` runs `pnpm dev` for local development. For a
server, override the `web` service to build and run in production mode
instead. Create `docker-compose.prod.yml`:

```yaml
services:
  web:
    command: sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm build && pnpm start"
    restart: unless-stopped
```

Then start everything:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 4. Run migrations (and, optionally, the seed)

```bash
docker compose exec web sh -c "cd apps/web && pnpm exec prisma migrate deploy"
```

`migrate deploy` (not `migrate dev`) applies existing migrations without
prompting or generating new ones — the right command for production.

The seed script (`pnpm db:seed`) fills in the listing-taxonomy categories and
filter-attribute groups (Projekt Typ, Grundwerte, ...), which the app expects
to exist for the "Projekt eintragen" form to render properly:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -e NODE_ENV=production web sh -c "cd apps/web && pnpm exec prisma db seed"
```

Setting `NODE_ENV=production` here matters: the seed script skips creating
its fixed-password local dev admin account when `NODE_ENV=production` (see
`prisma/seed.ts`). To get your first admin in production, register a normal
account through the site, then promote it directly in the database:

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c \
  "INSERT INTO \"UserRoleAssignment\" (id, \"userId\", role, \"createdAt\") \
   SELECT gen_random_uuid()::text, id, 'ADMIN', now() FROM \"User\" WHERE email = 'you@example.com';"
```

(`POSTGRES_USER`/`POSTGRES_DB` are whatever you set in `docker-compose.yml` —
check the `postgres` service's `environment:` block.)

## 5. Put a reverse proxy with TLS in front

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

## 6. Updating

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec web sh -c "cd apps/web && pnpm exec prisma migrate deploy"
```

## 7. Backups

- **Database:**
  ```bash
  docker compose exec postgres pg_dump -U <POSTGRES_USER> <POSTGRES_DB> > backup-$(date +%F).sql
  ```
- **Uploaded files (MinIO):** back up the `minio_data` Docker volume (holds
  photos/documents attached to listings, once media upload is wired up).

## Automated deploy

`scripts/deploy.sh` wraps steps 3–4 above over SSH, for redeploying after a
`git push`. See the comment header in that file for required environment
variables — it isn't run as part of building this feature, since that would
mean pushing to a real GitHub repo and deploying to a real server, neither of
which this session has access to.
