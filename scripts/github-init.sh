#!/usr/bin/env bash
#
# One-time helper to push this repo to a fresh GitHub repository.
#
# Usage:
#   scripts/github-init.sh git@github.com:<you>/<repo>.git
#
# Prerequisites:
#   - You've already created an empty repository on GitHub (no README/license,
#     so there's nothing to conflict with this repo's existing history).
#   - Your SSH key (or HTTPS credentials) for GitHub are already set up.
#
# This script does not run automatically — review it and run it yourself.

set -euo pipefail

REMOTE_URL="${1:?Usage: $0 <git-remote-url>}"

if git remote get-url origin >/dev/null 2>&1; then
  echo "A remote named 'origin' already exists:" >&2
  git remote get-url origin >&2
  echo "Remove it first (git remote remove origin) if you want to replace it." >&2
  exit 1
fi

git remote add origin "$REMOTE_URL"
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"

echo "Pushed to $REMOTE_URL"
