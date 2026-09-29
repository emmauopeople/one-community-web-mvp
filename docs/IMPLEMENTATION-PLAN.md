# One Community MVP: repository review and implementation plan

Date: 2026-09-29. This is an analysis and proposed implementation sequence, not a claim that the upgrade has been implemented.

## Decision and scope

Reuse the current React/Vite, Node/Express, PostgreSQL and Expo/React Native code. Deliver skill visibility as the first domain service in the future One Community microservice ecosystem. Build only the shared services needed for this domain. Two source repositories can contain several independently deployable services; repository boundaries are not service boundaries.

Primary reference: the supplied 13-page `One_Community_Phase1_Upgrade_Implementation_Plan_v1_1.pdf`, read in full, with representative requirement tables visually inspected. A byte-identical copy is saved in `references/`; SHA256 `3b7d17982b3df45d7f207711c57df78b275cc3b3abada85b0afd0b9970006110`.

The user's latest decisions override the PDF where they differ: two new repositories ending in `-mvp`, microservice boundaries, specified observability stack, manual local Docker execution, feature-to-release testing workflow, OVH deployment followed by promotion to main. Other ecosystem documents remain background references, not automatic additions to MVP scope.

Keep public discovery usable without login. Preserve the approved mobile two-column cards and detail design. Add provider mode, web parity, Cameroon location hierarchy, moderated reviews, incident reports, analytics, and EN/FR system text. Defer payments, subscriptions, paid placement, restaurants, hotels, rentals, real estate, AI search, and route planning.

## Low-bandwidth Cameroon requirement

### GPS requirement — latest user decision

Every skill listing must have a consented GPS location to support Near Me. This overrides the PDF's optional listing coordinates and its future-only Near Me direction. Near Me is now an MVP acceptance requirement.

- Providers explicitly consent to capture the location for each listing and grant the device/browser location permission. An existing OS permission alone is not evidence of consent to attach a location to a new listing.
- Each listing owns its own captured location snapshot: latitude, longitude, accuracy in meters, capture timestamp, source and consent timestamp/version. Do not silently substitute a provider profile coordinate or an IP-derived location for required capture.
- Explain that capture uses the device's current position and ask the provider to confirm it represents the listing's operating location. GPS is not proof of a business address or a verification badge. No continuous background tracking is needed.
- Providers can save an incomplete draft if permission is denied, positioning fails or they are offline. Submission for review/publication requires a valid consented location. Existing listings without GPS need a backfill/recapture workflow before becoming eligible for the upgraded public catalog; do not unpublish existing production data during migration without a planned cutover.
- Validate coordinate ranges and reject invalid values server-side. Establish a measured accuracy policy with a clear retry path; do not invent coordinates when capture is unreliable. For listing location changes, capture and confirm the replacement rather than overwriting silently.
- Public users opt into Near Me and grant device/browser location permission only when they request it. If denied, unavailable or revoked, ordinary city/area/text search remains usable. Explain radius and distance sorting; use distance from the captured listing position, not the provider's account location.
- Treat the public user's location as request-scoped by default. Do not persist exact visitor coordinates in analytics or logs. Return approximate distance and useful area/city context without exposing a provider's exact coordinates in public response payloads by default. Any later exact-pin display requires an explicit product decision and appropriate provider disclosure.
- Near Me must work as a compact list without loading a map. Limit/validate radius, paginate results, and filter to currently eligible listings. Any cached Near Me results must identify their age and search area and must not be mistaken for fresh positioning.


User-confirmed constraint: the MVP must work in low-bandwidth areas of Cameroon. This affects the first implementation batches, not only final performance tuning. The thresholds below are initial engineering budgets to validate on actual devices and local networks, not measured performance claims.

- Public discovery remains account-free. Show cached results immediately when available, clearly marked with their last update time; distinguish offline, empty results and server errors. Refresh on reconnect without discarding a usable screen. Cached visibility/approval status may be stale; server authorization and current listing eligibility remain authoritative for actions.
- Use explicit search submission initially, with no request for every keystroke. Cancel obsolete requests, use compact paginated results (initially 12 listings), and fetch listing detail only when opened. Avoid duplicate web/mobile calls for the same data.
- Initial budgets: first search JSON <=25 KB compressed for 12 listings; thumbnails <=30 KB each; normal detail images <=150 KB each; public web initial route JS <=200 KB compressed. Track payloads in CI with realistic fixtures. Revisit budgets explicitly if quality, accessibility or measured behavior requires a change.
- Load only images near the viewport, reserve layout space, and provide usable text/placeholder states. Generate multiple server-side image variants; request the smallest useful size. Do not load full-size images or prefetch entire galleries on detail entry. No autoplay video. Keep fonts/icons local and small; avoid mandatory third-party assets for rendering.
- Compress provider images before upload, then validate and process them server-side. Upload one image at a time initially, show bytes/progress, and retry only failed images. Persist provider drafts and queue explicit user-submitted changes with idempotency keys where supported. Never show an unacknowledged mutation as published or approved. Clear or isolate private drafts/cache on logout or account switch.
- Bound retries using backoff and jitter; avoid retry storms on reconnect. Mutating requests require idempotency before automatic retries. A timed-out email inquiry/review/report must not create duplicates if retried. Offer manual retry and clear pending/sent/failed status.
- Cache public reference data and recently viewed public content with bounded storage/expiry. Revalidate signed media URLs on expiry without reloading the entire result set. Do not precache private admin data or silently store sensitive report text in a shared public cache.
- Batch small analytics events with bounded queues and retention. Retry by stable event ID, preserve occurrence timestamps, and discard expired low-priority events. Never block search/contact navigation on analytics delivery. Account for delayed events in dashboards; avoid assuming analytics counts are complete in real time.
- Keep public discovery functional if location permission is denied. City/area text search must work without GPS, map downloads or geolocation services. Provider drafts can remain incomplete, but publication requires the listing GPS capture described above.
- Use response compression and conditional caching. Cache versioned thumbnails/static assets efficiently; keep private API responses and authorization decisions out of shared caches. Configure media/cache policies with the chosen OVH/Cloudflare setup and verify actual cache behavior before claiming a benefit.
- Add lightweight/data-saver preferences if automatic defaults are insufficient; users can explicitly request larger photos. Maintain legibility and meaningful image quality instead of making text or pictures unusable to meet a size target.

Release tests must include shaped slow links and complete disconnections, a low-end Android device, upload interruptions, repeated reconnects, expired media URLs, storage limits, and denied GPS. Initial test profiles: 400 kbps download / 150 kbps upload / 400 ms RTT; stress profile 150 kbps download / 75 kbps upload / 800 ms RTT. These are synthetic test conditions, not claims about all Cameroon networks. Measure cold/warm usable-content time, request count, transferred bytes, memory and task completion. Initial cold first-page target: readable results within 5 seconds on the first profile, without waiting for images. Confirm or revise after measurement and field feedback.

Offline data is a convenience, not a promise of offline transactions: provider approvals, reviews, reports and contact inquiries require eventual server acknowledgement. WhatsApp/phone actions also depend on the user's network and external application.

## Repositories and locations

Create these two empty GitHub repositories under `emmauopeople` (no generated README or license is needed for the import):

- `one-community-mobile-mvp`
- `one-community-web-mvp`

The connected GitHub toolset has no repository-creation operation; user creation is the next simple setup step. Preserve the four existing repositories and their licenses. Do not push upgrade work into them.

All four sources have been cloned into `C:\Users\User\projects`, corresponding to `/c/Users/User/projects` in Git Bash. The admin checkout is detached at its release revision for read-only inspection. The earlier working copies in this chat were retained; no recursive deletion or move was performed.

| Source | Inspected revision | Use |
|---|---|---|
| `1community_app` | main `0e24e069323bbb8099b7d1ae6b16a1a5d33f5406` | Web, API, tests, schema and media foundation; main/release trees currently match |
| `one-community-public-mobile-app` | main `b370526b3d3af4dfa42a56d301cf6789cbcc1336` | Primary unified mobile UI foundation |
| `one-community-provider-mobile` | main `3e858c8ae6ac6fd2250d027d5cd1fd396071a3bd` | Provider flow source, reconciled into the public app |
| `one-community-admin` | release `15fef8ac38e794a1b18cef83bd41d747fe49396c` | Admin UI/API; main is README/license only; dev/release trees currently match |

Proposed destination layout:

```text
one-community-mobile-mvp/
  src/{public,provider,shared,i18n}/
  contracts/                 # generated/versioned API client definitions
  tests/
  docs/

one-community-web-mvp/
  apps/{public-web,admin-web,admin-api}/
  services/{identity,skill-visibility,search,notifications}/
  contracts/{openapi,events}/
  database/{identity,skills,notifications}/
  infra/{compose,swarm,traefik,monitoring,logging}/
  scripts/
  tests/{contracts,integration,e2e}/
  docs/
```

Clean imports should retain licenses and record source revisions. Exclude cookie/session files, database dumps, backup source files, coverage output, node_modules and real environment credentials. Avoid importing old Git history wholesale until its contents have been reviewed. No new repository or remote branch has been created yet.

## Concrete findings

1. **Database bootstrap is not reproducible.** `backend/DB_SCHEMA.sql` has a trailing comma after `display_name TEXT` in `users`. Its `events.event_type` constraint allows only `search`, `skill_view`, `contact_click`, while the event API accepts `contact_click_whatsapp`, `contact_click_email`, media events and profile updates. A new database from this schema cannot support the current API correctly. Reconcile schema with every route, including support/admin session tables; do not use `backup.sql` as the migration baseline or seed real users.
2. **Analytics schemas and dashboards disagree.** Main API summary counts `contact_click`; separate admin API counts channel-specific events. The event route returns success even when event persistence fails. Failures need observable metrics and an explicit ingestion contract.
3. **Anonymous views are undercounted.** `eventService.js` deduplicates on listing and nullable user ID across five seconds. Distinct logged-out users therefore collapse together. Existing tests cover signed-in deduplication only.
4. **Search attribution is incomplete.** Smart search sends area/tokens to the event service, but it stores neither; query_id, result_count, language and client surface have no persistence path. Search logging occurs before the search result is obtained. Record successful query outcomes after execution and distinguish failed requests from no-result searches.
5. **Conversion figures are not funnels.** Admin divides total views by total searches and total contacts by total views. These can include unrelated actions and exceed 100%. They may be labeled activity ratios but cannot be presented as user conversion rates.
6. **Search tests miss the active implementation.** `src/app.js` mounts `smartSearch.js` before `skills.js`; current route tests mount only `skills.js`. Smart search uses English aliases, substring matches and a fixed limit of 50 without a page cursor. French/accent behavior, relevance and pagination need explicit tests.
7. **Auth is coupled and inconsistent.** Public/provider API uses cookie-session; admin uses PostgreSQL-backed express-session. Provider mobile uses credentialed HTTP and also contains token-storage helpers. Define and verify the mobile and browser identity contract before merging provider navigation. Admin and provider authorization must remain distinct.
8. **Backend service separation is incomplete.** Admin directly queries domain tables in the shared database. A target admin API should call the owning service's admin endpoints or read a deliberate projection, rather than acquire cross-service write permissions.
9. **Public trust behavior needs implementation.** General support/report_problem functionality exists, but it is not the complete listing-linked incident workflow and moderated-review state machine in the PDF. Preserve useful support features while adding explicit listing/report/review relationships and audit trails.
10. **Mobile dependencies need alignment.** Public mobile declares several dependencies as `latest`; provider mobile pins different navigation dependencies. Establish one supported Expo-compatible set and reproducible locks before merging screens.
11. **Storage and deployment assume older surroundings.** S3 client only configures a region; endpoint, addressing, bucket/CORS configuration and browser-reachable upload URLs need local/OVH support. Hardcoded production API/CORS values must become environment settings. Admin Compose references main-app images and Linux host-monitoring mounts; it is not a verified local Windows stack.
12. **Test depth is limited.** Main API: 16 existing tests pass in 5 suites, mostly with mocked DB/storage/email. Both admin smoke files assert `true`; they do not validate admin behavior. Neither mobile package declares a test script. No database, browser, native-device or container test has passed as part of this review.

## Minimum service boundaries

| Service/component | Initial responsibility | Data ownership |
|---|---|---|
| Identity service | Registration, verification, authentication, session/token lifecycle and role claims | `identity_db`: credentials, identities, roles, sessions; no listing ownership |
| Skill visibility service | Provider business profile and approval, locations, listing lifecycle, media metadata, reviews, incidents, skill-specific analytics | `skills_db`; identities referenced by opaque IDs; never read identity password tables |
| Search service + Meilisearch | Public search contract, approved listing index, query matching/ranking, indexing/rebuild | Derived index; skill visibility remains authoritative; no public Meili master key |
| Notification worker/service | Verification messages, contact inquiries, moderation/onboarding notifications, retry and delivery state | `notifications_db`; development delivery goes to a local mail sink |
| Admin API | Secured orchestration for the separate admin UI | Own session state if needed; service APIs for mutations and approved analytics read models |
| Media adapter in skill visibility | Authorized uploads, validation/processing, object keys and optimized images | Metadata in skills DB, binary objects in local S3-compatible storage/OVH Object Storage |

Start with a single local PostgreSQL container hosting separate logical databases and users. This is infrastructure consolidation, not cross-service database sharing. Additional standalone media, analytics, location or review services are not required for the MVP; their ownership and contracts should make later extraction possible.

Use transactional outboxes at the owning service plus idempotent workers for search indexing and notifications. Define event IDs, versions, retries and dead-letter/retry visibility. A broker can be added when justified; do not require a full message platform simply to start this pilot. Other domains remain absent.

Service splitting must be incremental: preserve the API contract consumed by the working clients during extraction. Replace shared SQL joins with minimal provider/identity projections and service calls, and test account suspension and role changes across service boundaries.

## Analytics design before new dashboards

Adopt the PDF event names as canonical, with `event_version`, unique `event_id`, received/occurred timestamps, surface (`web`, `mobile`, `provider`, `admin`), anonymous session identifier where appropriate, authenticated actor ID when available, `query_id`, listing/provider IDs, language and validated metadata. Keep a transitional mapping for old event names; do not rewrite ambiguous historical data as if its missing attributes were known.

- Search emits one completed-search record including result_count, duration, normalized bounded query and filters. Derive zero-result metrics from result_count; if also emitting `search_no_results`, do not count it as another search.
- Count impressions when a result is actually visible, with query/result position. Do not count every item sent by the API as seen.
- Attribute detail views and similar/provider-list navigation to their source. Deduplicate retries by unique event ID, not by all anonymous users sharing NULL.
- Browser/native contacts record WhatsApp or phone activation as intent. Neither is proof that a conversation occurred.
- Emit `email_inquiry_sent` only after the server's delivery workflow reaches its defined send-success state. Do not equate opening a modal with sending, or SMTP acceptance with inbox delivery.
- Registration, listing creation/approval, reviews and reports are server-authoritative events after committed business operations. Public clients cannot fabricate admin approvals.
- Measure contact conversion using distinct eligible sessions/queries with a later attributed contact, an explicit window and matching denominator. Track contact rate and per-channel counts separately.
- Provider analytics is filtered by server-verified ownership. Moderation notes, reporter contacts and other providers' details never enter that view.
- Exclude test/admin/provider-self traffic where appropriate and label bot filtering assumptions. Anonymous sessions are estimates of usage, not verified unique humans or cross-device identities.
- Bound metadata, redact contact details/tokens/message bodies, minimize raw IP and precise GPS retention, configure event retention, and export aggregates where enough. Do not use IPs or full queries as high-cardinality Prometheus labels.

Initial dashboards: admin operations; platform demand/no-result searches and supply gaps; provider listing performance; pilot adoption and contact intent. Product events live in owned transactional/analytics tables. Operational logs in OpenSearch and system metrics in Prometheus have different purposes.

## Local and OVH infrastructure

Use Docker Compose plus Traefik for normal local development. Prepare a separate Swarm stack for deployment rehearsal and OVH if Swarm is selected. The same application images and configuration contract should be used in both. Swarm stack deployment does not build images; build and tag images first, and use Swarm service labels/provider settings rather than assuming a Compose file is interchangeable. See [Docker stack deployment](https://docs.docker.com/engine/swarm/stack-deploy/) and [Traefik Swarm provider](https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/).

Local profiles: core app/data/search/mail/storage; metrics; logs. This lets the full stack be verified without forcing OpenSearch into every quick test run. Pin versions at implementation time. Resource limits and total Docker Desktop memory must be measured before choosing heap sizes or OVH capacity.

Required monitoring:

```text
Linux host / node-exporter + application /metrics -> Prometheus -> Grafana
Application structured JSON logs -> Fluent Bit -> OpenSearch -> OpenSearch Dashboards
```

Fluent Bit fills the missing log-collection role. Include request/correlation IDs, log redaction, retention and useful alerts. If desired, add Alertmanager when alert delivery is configured; Grafana can also provide alerting. Meilisearch handles public service discovery; OpenSearch handles logs initially.

On Docker Desktop, Linux node-exporter sees the Linux VM environment, not all native Windows host metrics. OVH Linux host metrics need the proper host mounts. A native Windows exporter would be an optional separate addition if Windows host metrics are required. See [node-exporter deployment notes](https://github.com/prometheus/node_exporter).

OpenSearch needs memory and Linux VM host settings checked; its documentation specifies `vm.max_map_count=262144`. Keep OpenSearch and Dashboards versions compatible. Do not copy demo security settings into OVH production. See [OpenSearch Docker setup](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/).

Cloudflare Tunnel comes after local validation, routes through Traefik, and exposes only intended web/API routes. Admin remains separately authorized. Database, Meilisearch, metrics, log APIs and management dashboards remain private or separately access-controlled. Do not initialize Swarm, alter host settings or publish a tunnel as part of a preflight script.

## Database and storage promotion

- Create numbered, service-owned SQL migrations with a migration ledger, checksums and a lock to prevent concurrent runs. Separate empty-environment bootstrap, incremental migration and synthetic seed commands.
- Specify supported PostgreSQL version/extensions and use the same versions locally and on OVH. Database roles may only access owned schemas/databases.
- Verify both a clean install and upgrade from a previous version. Test rollback by restoring a backup and redeploying the previous compatible image; destructive down-migrations are not the default recovery strategy.
- Promote the migration code to OVH, not the PC's Docker volume. Start OVH clean with approved data, or perform an explicit dump/restore of approved pilot data if retention is needed. Do not copy synthetic test users into production.
- Reconcile preexisting databases using a read-only schema export before any existing real dataset is migrated. The source schema file is insufficient evidence of live schema state.
- Use object-storage adapters with environment-specific endpoints, credentials, bucket CORS and presigned URL behavior. Test upload, validation, thumbnail access, deletion and orphan cleanup in local and OVH environments. Do not place OVH keys in mobile/web bundles.
- Swarm node-local volumes do not automatically travel with rescheduled stateful services. Pin stateful workloads to prepared storage nodes initially; test backups/restores before enabling wider rescheduling. One local node is not a high-availability test.

## Feature/release/main workflow

For each repository, create a minimal initial commit and establish `release` and `main`; implementation then happens on short-lived `feature/*` branches based on `release`.

1. Implement a bounded feature with tests and a feature branch commit.
2. Run available unit, contract, lint/build and integration checks; record any checks that require the user's Docker engine.
3. Push the feature branch and open a PR targeting `release`. Do not merge on the strength of mocked tests alone.
4. Provide exact Git Bash fetch/switch/pull commands with actual repository and branch names, then the relevant migration/start/test commands. Use `git pull --ff-only`; never overwrite local modifications.
5. User tests locally. Fix issues on the same feature branch and repeat only affected checks plus necessary regression checks.
6. Merge into `release` after local acceptance and required checks. `main` is not the integration branch.
7. Later CI/CD builds immutable images from the approved release commit, runs migrations once, deploys those exact artifacts to OVH and verifies health/end-to-end smoke checks.
8. After successful cloud deployment, merge/promote the deployed release revision into `main` and tag the deployment. Do not rebuild unrelated artifacts from a moving branch. Reconcile any emergency main fix back into release.

Keep CI tests early; automate deployment at the end as requested. Until then provide manual commands. Branch protections and required checks are configured once the new repos exist.

## Implementation batches and acceptance gates

| Batch / proposed feature branch | Scope | Acceptance gate |
|---|---|---|
| 01 `feature/mvp-foundation` | Clean imports, licenses/provenance, Node/Expo locks, layouts, env examples, core Docker/Traefik, migration runner, baseline CI | Clean clone installs; reproducible build; empty DB bootstrap; no legacy secrets/data imported |
| 02 `feature/identity-and-provider-onboarding` | Identity extraction, role boundaries, provider profile, structured location defaults, notification delivery | Browser/native login contract, expiry/logout, provider approval, unauthorized operations rejected |
| 03 `feature/skill-lifecycle-and-media` | Draft/pending/active/rejected/paused/suspended listing states, ownership, image workflows, location snapshots | Only approved active listings public; ownership and upload tests; synthetic lifecycle walkthrough |
| 04 `feature/search-and-analytics-contracts` | Search service/indexing, canonical events, pagination, result attribution and no-result tracking | Live smart-search tests, DB constraints, idempotent analytics/indexing, search relevance fixtures |
| 05 `feature/unified-mobile` | Public-first app, provider mode, shared session/client, approved layout retained, gallery | APK/device public discovery + provider create/edit/media/preview; no admin UI in mobile |
| 06 `feature/web-parity` | Search, provider profile, all-provider/similar listings, gallery, contact tracking | Same fixtures and core journeys on web/mobile; usable responsive views |
| 07 `feature/trust-and-bilingual-ui` | Incident/review workflows, moderation, EN/FR core public/provider strings | Pending reviews hidden, reports in admin, audited moderation, persisted language choice |
| 08 `feature/pilot-dashboards-and-observability` | Final analytics dashboards, metrics/log pipeline, retention and alert tests | Reconciled seeded counts; ownership filters; request trace from failure to log/metric |
| 09 `feature/local-release-rehearsal` | Complete local testing, optional Swarm rehearsal, storage backup/restore, Cloudflare readiness | Manual acceptance checklist signed off; restore verified; no internal service publicly routed |
| 10 `feature/ovh-release-pipeline` | Release CI/CD, OVH configuration/storage, migration job, rollback and post-deploy smoke checks | Deploy approved release artifacts; verify cloud; then promote deployed revision to main |

Analytics contracts begin in batch 04 before broad UI instrumentation; dashboard polish comes later. EN/FR translation keys should be introduced as screens change, not left to a full rewrite in batch 07. Adjust batch size when a PR would otherwise become hard to review.

## Verification completed during this analysis

- Four repositories cloned under the requested projects directory; branch trees inspected.
- Supplied PDF: all 13 pages extracted, representative requirement tables visually reviewed, retained copy SHA256 verified.
- Main backend installed from its existing package-lock using `npm ci --ignore-scripts`; lifecycle install scripts were not run. Existing Jest suite: 5 suites, 16 tests pass. This does not verify native production startup.
- Two new, isolated analytics requirements tests executed against actual event-service source with a mocked DB adapter: 2 failures, reproducing anonymous-view suppression and lost query attribution. These are explicitly failing audit cases, not changes to original source tests.
- Admin smoke tests inspected and found nonfunctional (`expect(true).toBe(true)`). Full admin build/test suite not run.
- No Docker engine execution, SQL migrations, app builds, physical-device tests, public exposure, new GitHub repo creation, source changes, commits, pushes or merges performed.

Next step: create the two empty repositories, then start batch 01 with local-test commands and the requirements/test matrix in `TEST-PLAN.md`.
