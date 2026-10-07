#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLOUDFLARED_IMAGE="$(tr -d '\r\n' < .env.tunnel-image)"
[[ "$CLOUDFLARED_IMAGE" =~ ^cloudflare/cloudflared@sha256:[a-f0-9]{64}$ ]] || { printf 'Invalid pinned tunnel image.\n' >&2; exit 1; }
docker compose -f compose.yaml -f compose.tunnel.yaml exec -T tunnel-gateway nginx -t
docker compose -f compose.yaml -f compose.tunnel.yaml restart tunnel-gateway
node scripts/tunnel-gateway-check.mjs
node scripts/tunnel-check.mjs
