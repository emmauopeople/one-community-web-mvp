#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker version >/dev/null
docker compose version
node scripts/setup-local.mjs
# Quiet validation avoids printing expanded credentials.
docker compose config --quiet
docker compose up --build -d
docker compose run --build --rm seed
node scripts/smoke.mjs
printf '\nPublic web: http://localhost:8080\nAdmin: http://localhost:8081\nMail inbox: http://localhost:8025\n'
printf 'Credentials: inspect your local .env. Stop with docker compose down (keep volumes).\n'
