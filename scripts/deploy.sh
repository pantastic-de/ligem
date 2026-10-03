#!/usr/bin/env bash
#
# Deploy LiGem to the production server over SSH: pulls the pushed branch,
# rebuilds and restarts the Docker Compose stack in production mode.
#
# What happens where:
#   1. Locally: refuses to deploy while anything is uncommitted or not yet
#      pushed. The server only ever gets what is on GitHub (origin), so a
#      forgotten commit/push would otherwise silently deploy an old version
#      (e.g. without a new migration).
#   2. On the server: resets the checkout to exactly that commit, shows what
#      changed (commits, new migrations), checks .env for known pitfalls.
#   3. The `web` container's own start command (docker-compose.prod.yml)
#      then runs pnpm install, prisma generate, the build, prisma migrate
#      deploy and the seed, in that order, before the app starts serving.
#      Migrations deliberately stay there, not as a separate step here
#      racing against the build.
#   4. Waits until the app answers, then verifies with `prisma migrate
#      status` that no migration is left pending.
#
# Usage:
#   scripts/deploy.sh
#
# Optional:
#   DEPLOY_HOST / DEPLOY_USER / DEPLOY_PATH   override the defaults below
#   DEPLOY_SSH_KEY=~/.ssh/id_ligem_deploy     defaults to your default SSH key
#   DEPLOY_BRANCH=main                        defaults to main
#   DEPLOY_READY_TIMEOUT=600                  seconds to wait for the app (install + build take a while)
#   DEPLOY_ALLOW_DIRTY=1                      deploy despite uncommitted local changes (they are NOT deployed)

set -euo pipefail

: "${DEPLOY_HOST:=ligem.de}"
: "${DEPLOY_USER:=web58}"
: "${DEPLOY_PATH:=/var/www/ligem.de/web/ligem}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_READY_TIMEOUT="${DEPLOY_READY_TIMEOUT:-600}"

SSH_OPTS=()
if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi

# --- 1. Local checks -------------------------------------------------------

cd "$(git rev-parse --show-toplevel)"

# Untracked files count too (a new migration or page that was never added
# would be missing on the server). Only local editor/agent settings under
# .claude/ are ignored.
dirty="$(git status --porcelain --untracked-files=all | grep -v -E '^\?\? \.claude/' || true)"
if [ -n "$dirty" ]; then
  changed="$(echo "$dirty" | grep -vc '^??' || true)"
  added="$(echo "$dirty" | grep -c '^??' || true)"
  # Short list: the first few files, the rest only as a count.
  list_files() {
    local files count
    files="$(echo "$dirty" | grep -E "$1" | cut -c4- || true)"
    count="$(echo -n "$files" | grep -c '' || true)"
    [ "$count" -eq 0 ] && return
    echo "  $2:"
    echo "$files" | head -8 | sed 's/^/    /'
    [ "$count" -gt 8 ] && echo "    … und $((count - 8)) weitere"
    return 0
  }

  if [ "${DEPLOY_ALLOW_DIRTY:-}" != "1" ]; then
    {
      echo "DEPLOY ABGEBROCHEN: Es wurde nichts auf den Server übertragen."
      echo
      echo "Grund: $changed geänderte und $added neue Datei(en) sind noch nicht committet."
      echo "Der Server bekommt nur, was auf GitHub ist, also würde sonst der alte Stand deployt."
      echo
      list_files '^( M|M |MM|A |D | D|R )' "geändert"
      list_files '^\?\?' "neu"
      echo
      echo "So geht's weiter:"
      echo "  git add -A && git commit -m \"…\" && git push"
      echo "  danach dieses Script erneut starten."
    } >&2
    exit 1
  fi
  echo "DEPLOY_ALLOW_DIRTY=1: $changed geänderte und $added neue Datei(en) werden NICHT deployt." >&2
fi

git fetch --quiet origin "$DEPLOY_BRANCH"
target_commit="$(git rev-parse "origin/$DEPLOY_BRANCH")"

if [ "$(git rev-parse --abbrev-ref HEAD)" = "$DEPLOY_BRANCH" ]; then
  ahead="$(git rev-list --count "origin/$DEPLOY_BRANCH..HEAD")"
  behind="$(git rev-list --count "HEAD..origin/$DEPLOY_BRANCH")"
  if [ "$ahead" -gt 0 ]; then
    {
      echo "DEPLOY ABGEBROCHEN: Es wurde nichts auf den Server übertragen."
      echo
      echo "Grund: $ahead Commit(s) sind noch nicht gepusht:"
      git log --oneline "origin/$DEPLOY_BRANCH..HEAD" | head -10 | sed 's/^/  /'
      echo
      echo "So geht's weiter: git push origin $DEPLOY_BRANCH, danach dieses Script erneut starten."
    } >&2
    exit 1
  fi
  if [ "$behind" -gt 0 ]; then
    echo "Hinweis: origin/$DEPLOY_BRANCH ist $behind Commit(s) weiter als dein lokaler Stand; deployt wird origin."
  fi
else
  echo "Hinweis: du bist nicht auf '$DEPLOY_BRANCH'; deployt wird origin/$DEPLOY_BRANCH."
fi

echo "Deploye $(git log -1 --format='%h %s' "$target_commit")"
echo "  nach $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"
echo

# --- 2.-4. On the server ---------------------------------------------------

ssh "${SSH_OPTS[@]+"${SSH_OPTS[@]}"}" "$DEPLOY_USER@$DEPLOY_HOST" \
  bash -s -- "$DEPLOY_PATH" "$DEPLOY_BRANCH" "$target_commit" "$DEPLOY_READY_TIMEOUT" <<'REMOTE'
set -euo pipefail
DEPLOY_PATH="$1"
DEPLOY_BRANCH="$2"
TARGET_COMMIT="$3"
READY_TIMEOUT="$4"

cd "$DEPLOY_PATH"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

previous_commit="$(git rev-parse HEAD 2>/dev/null || true)"
git fetch --quiet origin </dev/null
git checkout --quiet "$DEPLOY_BRANCH" </dev/null
git reset --quiet --hard "origin/$DEPLOY_BRANCH" </dev/null
current_commit="$(git rev-parse HEAD)"

if [ "$current_commit" != "$TARGET_COMMIT" ]; then
  echo "Der Server hat $current_commit ausgecheckt, erwartet war $TARGET_COMMIT." >&2
  echo "Wurde in der Zwischenzeit erneut gepusht? Dann das Deploy einfach wiederholen." >&2
  exit 1
fi

if [ -n "$previous_commit" ] && [ "$previous_commit" != "$current_commit" ]; then
  echo "Neue Commits seit dem letzten Deploy:"
  git log --oneline "$previous_commit..$current_commit" | head -30 | sed 's/^/  /'
  new_migrations="$(git diff --name-only --diff-filter=A "$previous_commit" "$current_commit" -- apps/web/prisma/migrations | grep 'migration.sql$' || true)"
  if [ -n "$new_migrations" ]; then
    echo "Neue Datenbank-Migrationen (laufen beim Start des Containers):"
    echo "$new_migrations" | sed 's#apps/web/prisma/migrations/##; s#/migration.sql##; s/^/  /'
  fi
  echo
elif [ "$previous_commit" = "$current_commit" ]; then
  echo "Der Server war schon auf diesem Stand; der Container wird trotzdem neu gebaut und gestartet."
  echo
fi

# Known .env pitfalls. Only warnings: the app runs without the optional keys.
if [ -f .env ]; then
  env_value() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
  for key in DATABASE_URL AUTH_SECRET; do
    if [ -z "$(env_value "$key")" ]; then
      echo "WARNUNG: $key fehlt in .env, die App wird so nicht starten." >&2
    fi
  done
  if [ -z "$(env_value SMTP_HOST)" ]; then
    echo "Hinweis: SMTP_HOST ist nicht gesetzt, es werden keine E-Mails verschickt."
  fi
  smtp_from="$(env_value SMTP_FROM)"
  if [ -n "$smtp_from" ] && [[ "$smtp_from" != *@* ]]; then
    echo "Hinweis: SMTP_FROM enthält nur einen Namen (\"$smtp_from\"). Die App ergänzt die Adresse aus SMTP_USER;"
    echo "         eindeutiger ist: SMTP_FROM=\"$smtp_from <$(env_value SMTP_USER)>\""
  fi
else
  echo "WARNUNG: keine .env in $DEPLOY_PATH gefunden." >&2
fi

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
#
# Every command here gets </dev/null: this whole block reaches the server
# as bash's stdin (ssh … bash -s <<REMOTE), and docker compose reads stdin,
# which swallowed the rest of the script — the readiness check and final
# report silently never ran.
"${COMPOSE[@]}" stop web </dev/null || true
"${COMPOSE[@]}" up -d --no-deps --build web </dev/null

# Poll for the app actually answering, rather than declaring success as soon
# as the container merely exists: `restart: unless-stopped` means a
# container whose build or migration fails still shows as running moments
# after `up -d` returns, right up until it crashes and gets restarted. The
# app only starts after `prisma migrate deploy` succeeded, so an answer also
# means the migrations went through.
echo "Warte, bis die App antwortet (Installation, Build und Migrationen laufen, max. ${READY_TIMEOUT}s)..."
ready=""
deadline=$((SECONDS + READY_TIMEOUT))
while [ "$SECONDS" -lt "$deadline" ]; do
  if curl -sf -o /dev/null http://localhost:3000 </dev/null; then
    ready=1
    break
  fi
  sleep 5
done

if [ -z "$ready" ]; then
  echo "Die App hat nach ${READY_TIMEOUT}s nicht geantwortet. Letzte Log-Zeilen:" >&2
  "${COMPOSE[@]}" logs --tail=60 web </dev/null >&2 || true
  exit 1
fi

# Double-check that nothing is pending (e.g. a migration that failed and
# was retried by a restart in between).
if ! "${COMPOSE[@]}" exec -T web sh -c "pnpm exec prisma migrate status" </dev/null > /tmp/ligem-migrate-status.txt 2>&1; then
  echo "Die App läuft, aber prisma migrate status meldet ein Problem:" >&2
  cat /tmp/ligem-migrate-status.txt >&2
  exit 1
fi
grep -E "up to date|migrations found" /tmp/ligem-migrate-status.txt | sed 's/^/  /' || true

echo "Deploy fertig: $(git log -1 --format='%h %s' "$current_commit") ist live."
REMOTE
