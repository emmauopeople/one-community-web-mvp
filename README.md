> **Current feature: provider location and nearby discovery (v1.2).** Read `docs/V1.2-IMPLEMENTATION.md` for current behavior, upgrade requirements and remaining scope. The foundation notes below describe the earlier baseline.

# One Community Web MVP

Foundation branch for a low-bandwidth Cameroon skill-discovery pilot. Public web,
separate admin UI/API and the existing skill API have been imported without old
Git history, credentials, cookie files, dumps or build output. Source revisions
and licenses are in `docs/`.

**Local development only. This is not the completed upgrade or a public release.**
Authentication is still in the legacy API, and admin still uses its database.
Independent identity/search/notification services, Meilisearch, full analytics
corrections, GPS consent/publication gates, moderated reviews/reports, EN/FR and
the monitoring/logging stack remain implementation work. Do not expose this
foundation through Cloudflare or deploy it to OVH yet.

## Requirements and startup

Node.js 24, npm, Git Bash, Docker Desktop Linux containers and Compose v2.

```bash
cd /c/Users/User/projects/one-community-web-mvp
git fetch origin
git switch feature/mvp-foundation
git pull --ff-only origin feature/mvp-foundation
npm ci
npm test
bash scripts/local-up.sh
```

The script preserves an existing `.env`, otherwise generates random local
credentials, validates Compose without printing secrets, builds containers,
runs migrations, inserts **synthetic** test records, and checks health/search and
anonymous admin rejection. Volumes survive `docker compose down`.

| Address | Purpose |
|---|---|
| http://localhost:8080 | Public/provider web |
| http://localhost:8081 | Separate admin portal |
| http://localhost:8082 | API for emulator/USB device |
| http://localhost:8025 | Local email inbox |

Open `.env` locally for `LOCAL_ADMIN_PASSWORD` and `LOCAL_PROVIDER_PASSWORD`.
Admin email: `admin@example.test`; provider email: `provider@example.test`.
Do not share or commit `.env`. Reseeding never resets passwords. Registration
OTPs appear in Mailpit, not application logs. Development email stays local.

The synthetic listing has no images. Object-storage uploads are unconfigured in
this foundation; implement/test local and OVH storage in the media feature.
All exposed ports bind to 127.0.0.1. PostgreSQL has no host port. Traefik uses a
file provider with no Docker socket mount or exposed management dashboard.

## Checks

```bash
npm run check:secrets
npm run install:apps
npm run test:legacy
npm run build
npm test
# After Docker startup and seeding:
npm run test:smoke
```

Root tests execute migrations in PGlite (PostgreSQL WASM), verify rollback and
history integrity, and check Compose boundaries. They do not replace actual
Docker PostgreSQL validation. CI also builds images and runs container smoke
checks. Original admin tests are only test-harness smoke tests.

No automatic deployment or merge is configured. PRs target `release`; local
acceptance precedes merge. Deploy approved `release` artifacts to OVH later,
then promote the successfully deployed revision to `main`.

## Database and service boundaries

`database/migrations` bootstraps a **new** compatibility database. It fixes the
old syntax/event mismatch and adds missing registration/admin/support tables.
It is not an upgrade for an unknown production database. Inspect a read-only
schema export before planning a real-data upgrade. Migrations are checksummed,
serialized by PostgreSQL advisory lock and transactional per file. Never edit
applied migrations. Synthetic seed requires `LOCAL_DEVELOPMENT=true`.

The next identity feature replaces cross-service SQL with APIs/projections and
separate service DB roles. That extraction is explicitly unfinished here.

## Handoff evidence

- 6 migration/config tests passed; 16 original skill API tests passed.
- 2 original admin harness smoke tests passed.
- Public/admin production builds passed with native Vite config loading.
- Initial public JS is approximately 109 KB gzip; admin approximately 101 KB.
- Agent Docker execution is unavailable: verify CI and run the startup script.
- No public deployment, source-repository changes, or release/main merges.

See `docs/IMPLEMENTATION-PLAN.md`, `docs/TEST-PLAN.md` and source provenance for
the full requirements. Those are design references; this README describes the
current branch's actual scope.
