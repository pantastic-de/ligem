#!/usr/bin/env bash
#
# Deploy LiGem to a server over SSH: pulls the latest code, rebuilds and
# restarts the Docker Compose stack in production mode, and applies pending
# Prisma migrations.
#
# This script is not executed automatically anywhere — it needs a real
# target server and is meant to be reviewed and run by hand (or wired into
# your own CI job) once you've filled in the variables below.
#
# Usage:
#   DEPLOY_HOST=your.server.tld \
#   DEPLOY_USER=deploy \
#   DEPLOY_PATH=/srv/ligem \
#   scripts/deploy.sh
#
# Optional:
#   DEPLOY_SSH_KEY=~/.ssh/id_ligem_deploy   # defaults to your default SSH key
#   DEPLOY_BRANCH=main                       # defaults to main

set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST to the target server hostname or IP}"
: "${DEPLOY_USER:?Set DEPLOY_USER to the SSH user on the server}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH to the absolute path of the repo on the server}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

SSH_OPTS=()
if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi

echo "Deploying branch '$DEPLOY_BRANCH' to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"

ssh "${SSH_OPTS[@]+"${SSH_OPTS[@]}"}" "$DEPLOY_USER@$DEPLOY_HOST" bash -s -- "$DEPLOY_PATH" "$DEPLOY_BRANCH" <<'REMOTE'
set -euo pipefail
DEPLOY_PATH="$1"
DEPLOY_BRANCH="$2"

cd "$DEPLOY_PATH"

git fetch origin
git checkout "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

# Production uses the server's native PostgreSQL/PostGIS (see DEPLOYMENT.md),
# not the Dockerized `postgres` service — that one is dev-only. --no-deps is
# required here, not just omitting "postgres" from the service list: Compose
# merges depends_on across -f files rather than replacing it, so `web` still
# depends_on postgres in the merged config and would auto-start it otherwise.
#
# Stop the targeted services explicitly before recreating them: Compose's
# in-place recreate (stop old container, then immediately bind the new one to
# the same port) can lose the race and fail with "address already in use" if
# the old container hasn't fully released its port yet. `|| true` because on
# the very first deploy there's nothing running yet to stop.
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop web valkey meilisearch minio || true
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build web valkey meilisearch minio

# Wait for the web container to actually be up before running migrations.
for _ in $(seq 1 30); do
  if docker compose exec -T web true 2>/dev/null; then
    break
  fi
  sleep 2
done

# No "cd apps/web" needed: the web service's working_dir is already
# /workspace/apps/web (see docker-compose.yml).
docker compose exec -T web sh -c "pnpm exec prisma migrate deploy"

echo "Deploy complete."
REMOTE
