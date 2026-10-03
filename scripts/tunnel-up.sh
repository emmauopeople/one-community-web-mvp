#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker info >/dev/null
npm test
node scripts/smoke.mjs
if [[ ! -s .env.tunnel-token ]]; then
  printf 'Paste only the Cloudflare tunnel token (hidden), then press Enter: '
  IFS= read -r -s tunnel_token
  printf '\n'
  tunnel_token="${tunnel_token//$'\r'/}"
  if [[ ! "$tunnel_token" =~ ^[A-Za-z0-9+/=_-]{40,}$ ]]; then
    printf 'Invalid token format. Paste the token only, not the docker command.\n' >&2
    exit 1
  fi
  (umask 077; printf '%s' "$tunnel_token" > .env.tunnel-token)
  unset tunnel_token
fi
if [[ ! -s .env.tunnel-image ]]; then
  docker pull cloudflare/cloudflared:latest
  docker image inspect cloudflare/cloudflared:latest --format '{{index .RepoDigests 0}}' > .env.tunnel-image
fi
IFS= read -r CLOUDFLARED_IMAGE < .env.tunnel-image
CLOUDFLARED_IMAGE="${CLOUDFLARED_IMAGE//$'\r'/}"
[[ "$CLOUDFLARED_IMAGE" =~ ^cloudflare/cloudflared@sha256:[a-f0-9]{64}$ ]] || { printf 'Invalid pinned connector image.\n' >&2; exit 1; }
export CLOUDFLARED_IMAGE
docker compose -f compose.yaml -f compose.tunnel.yaml config --quiet
docker compose -f compose.yaml -f compose.tunnel.yaml up --build -d tunnel-gateway
node scripts/tunnel-gateway-check.mjs
docker compose -f compose.yaml -f compose.tunnel.yaml up -d cloudflared
printf '\nConnector started. In Cloudflare add a published application route:\nDomain: servicecam.org (subdomain and path blank)\nService: HTTP, tunnel-gateway:8080\nThen run: node scripts/tunnel-check.mjs\n'
printf 'Public provider login now uses HTTPS. Admin remains http://localhost:8081. Email still uses Mailpit.\n'
