#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLOUDFLARED_IMAGE="$(tr -d '\r\n' < .env.tunnel-image)"
[[ "$CLOUDFLARED_IMAGE" =~ ^cloudflare/cloudflared@sha256:[a-f0-9]{64}$ ]] || { printf 'Invalid pinned connector image.\n' >&2; exit 1; }
docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.admin-tunnel.yaml config --quiet
docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.admin-tunnel.yaml up --build -d admin-tunnel-gateway
docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.admin-tunnel.yaml exec -T admin-tunnel-gateway nginx -t
docker compose -f compose.yaml -f compose.tunnel.yaml -f compose.admin-tunnel.yaml restart admin-tunnel-gateway
node scripts/admin-tunnel-check.mjs
printf '\nAdmin gateway ready. Route admin.servicecam.org to HTTP admin-tunnel-gateway:8080.\nProtect with Access should be disabled for this tunnel-only configuration.\nSign in with your existing admin credentials.\n'
