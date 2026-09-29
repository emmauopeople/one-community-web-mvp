# Current v1.2 acceptance

The PDF v1.2 overrides the earlier per-listing consent scenarios below. Consent and location capture are mandatory at provider onboarding, not at each skill creation. Verify registration begin/completion reject omitted/false consent; valid registration persists consent; new skills inherit profile coordinates without recapture; withdrawal hides public data but preserves account access; nearby results match both clients; category cards are removed and phone-width web has no horizontal overflow.

Automated coverage: tests/provider-discovery.test.mjs executes real HTTP routes and PostgreSQL WASM, including existing pending registration bypass, snapshot preservation, pagination and exact-coordinate privacy. Existing foundation tests also run. Browser checks cover 375px layout, nearby opt-in/out and consent/capture gating with mocked API responses. Physical-phone and actual Docker acceptance still follow CI.

## Historical foundation test plan (superseded where noted)

# MVP test cases and execution status

These are acceptance cases to automate during implementation. Unless explicitly stated below, they are designed but NOT executed. Each feature must add behavioral tests and a local verification command; mock-only passes cannot substitute for database, browser or device tests.

## Already executed

| Check | Result | Limit |
|---|---|---|
| Original main backend Jest suite | 16/16 pass, 5/5 suites | DB/storage/mail mocked; legacy search route covered |
| New anonymous analytics visitor regression | FAIL: expected second visitor view, no insertion occurred | Actual source with mocked DB response |
| New query attribution regression | FAIL: query_id absent from persisted parameters | Actual source with mocked DB response |

`analytics-regression.test.mjs` deliberately expresses required behavior and currently exits nonzero. It is an audit artifact, not part of upstream CI. Run using Node with `--experimental-vm-modules --test`. Set `ONECOMMUNITY_SOURCE` if the original main application checkout has a different location.

## Database and contracts

| ID | Scenario | Expected result |
|---|---|---|
| DB-01 | Bootstrap all owned databases from empty volumes | Migrations succeed; required tables, constraints and extensions exist |
| DB-02 | Run migration command twice | Second run makes no changes; checksums match |
| DB-03 | Start two migration runners | Lock prevents conflicting execution |
| DB-04 | Upgrade previous schema with synthetic records | Data and FK relationships retained; new fields safely defaulted |
| DB-05 | Inject a transactional migration failure | No partially applied migration recorded |
| DB-06 | Restore backup into a fresh local instance | Counts/relationships verified and app reads restored data |
| DB-07 | Use identity DB role to access skills data | Access rejected |
| API-01 | Run current web/mobile contract fixtures | Stable versioned request/response schemas; no credential fields in public responses |
| API-02 | Stop notification/search worker | Domain writes retained; outbox retries later without duplication |

## Authentication, provider and listing lifecycle

| ID | Scenario | Expected result |
|---|---|---|
| AUTH-01 | Anonymous public search/detail/provider profile | Works without account |
| AUTH-02 | Provider registration, valid/expired/reused OTP | Valid completes once; expired/reused rejected; mail captured locally |
| AUTH-03 | Wrong password/repeated attempts | Safe errors and enforced throttling |
| AUTH-04 | Login, app restart, expiry, logout | Browser/native session contract honored; logged-out credentials rejected |
| AUTH-05 | Provider invokes admin action or other provider edit | 403/404 and no mutation |
| AUTH-06 | Provider or admin account suspended with existing session | Restricted operations revoked according to documented policy |
| SKILL-01 | Save provider default Cameroon location | Region/division hierarchy valid; Other subdivision supported |
| SKILL-02 | Create listing from defaults, then edit provider default | Listing retains its own location snapshot |
| SKILL-03 | Submit draft, approve/reject, pause/reactivate/suspend | Only permitted transitions; only approved eligible listings public |
| SKILL-04 | Provider edits another provider's listing/media | Ownership check blocks action |
| MEDIA-01 | Upload allowed image, reorder, delete | Metadata/order/object state consistent; optimized thumbnails available |
| MEDIA-02 | Oversize/unsupported/mislabelled upload or foreign object key | Rejected before public serving; no access to others' media |
| MEDIA-03 | Expired presign/local and OVH endpoint/CORS checks | Expected expiry; intended browser/mobile origins work |

## Search, mobile and web parity

| ID | Scenario | Expected result |
|---|---|---|
| SEARCH-01 | Query plumber Emana Yaounde / tailor Bonaberi | Expected controlled-fixture matches and location relevance |
| SEARCH-02 | EN/FR query, accents, aliases, typo, empty query | Documented normalization/ranking and bounded results |
| SEARCH-03 | Traverse pages and repeat query | Stable cursor/order; no missing or repeated records in unchanged dataset |
| SEARCH-04 | Unpublish/suspend indexed listing | Stops appearing within defined freshness target; detail access rechecks visibility |
| SEARCH-05 | Duplicate/out-of-order index event, rebuild index | Idempotent versioned updates; rebuild can switch safely |
| SEARCH-06 | Search engine unavailable | Documented fallback/error; no fabricated results; observable failure |
| UI-01 | Detail on web/mobile using same listing | Same public fields, provider, all listings, similar listings, contacts |
| UI-02 | Full-screen photo gallery | Swipe/zoom where supported, X returns to detail; no contact/provider overlay |
| UI-03 | Public browsing then provider login/dashboard | Approved public layout preserved; provider tools authenticated; no admin screens |
| UI-04 | EN/FR toggle and restart/reload | Preference persists; core system text translated; user content not silently changed |
| UI-05 | Android APK on low-end device/slow network | Loading/error states, thumbnails and pagination usable; measured performance recorded |

## Trust and analytics

| ID | Scenario | Expected result |
|---|---|---|
| TRUST-01 | Submit review | Pending by default; never public before approval |
| TRUST-02 | Approve/reject/hide review | Public list and aggregate rating reflect approved records only; actor audited |
| TRUST-03 | Report listing with each supported reason | Linked admin queue record; reporter data excluded from public/provider views |
| TRUST-04 | Abusive repeated reviews/reports | Validation and rate limits enforced; legitimate request path remains usable |
| ANA-01 | Two anonymous visitors view same listing within 5 seconds | Both counted; current audit regression fails |
| ANA-02 | Retry same event ID/concurrent duplicate delivery | Counted once using atomic DB constraint, not read-before-write dedupe |
| ANA-03 | Successful empty search vs failed search | No-results counts only successful zero-result query; query_id/result_count/language retained |
| ANA-04 | Query -> visible impression -> view -> contact | Same attribution chain on web/mobile; source and position preserved |
| ANA-05 | WhatsApp click, modal open, successful email send, failed send | Intent vs send success distinctly named; no send event for modal/failure |
| ANA-06 | View with no preceding search, repeated contacts, multi-listing session | Funnel denominator/window yields interpretable bounded conversion; raw ratios labeled separately |
| ANA-07 | Provider requests other provider's analytics | Data access denied or scoped to own listings server-side |
| ANA-08 | Spoof approval event/public event flooding | Privileged events rejected; validated size/rate limits; authoritative events generated by server |
| ANA-09 | Analytics DB write fails | App behavior follows contract; failure visible in metrics/logs; retry doesn't duplicate |
| ANA-10 | Seed fixed event set, run dashboard aggregations | Exact expected counts including UTC/time-window boundaries and legacy mappings |

## Listing GPS and opt-in Near Me

These requirements override the PDF's optional listing coordinates. Cases are designed, not yet executed.

| ID | Scenario | Expected result |
|---|---|---|
| GPS-01 | Provider consents and captures a listing's operating location | Listing snapshot stores valid coordinates, accuracy, capture/consent timestamps and source |
| GPS-02 | Provider denies permission, GPS times out or no position is available | Draft can be saved; submission/publication blocked with an actionable explanation |
| GPS-03 | OS permission already granted; provider creates a second listing | Explicit confirmation to attach the captured location to that listing; no silent profile-coordinate reuse |
| GPS-04 | Out-of-range coordinates or unacceptable accuracy | Invalid submission rejected; user can retry capture; no fabricated fallback location |
| GPS-05 | Public user requests Near Me and consents | Eligible listings returned within selected radius and ordered by distance using listing coordinates |
| GPS-06 | Public user denies/revokes location permission | City/area/text search still works; no repeated coercive permission prompts |
| GPS-07 | Two listings from one provider have different captured positions | Each is ranked from its own location snapshot |
| GPS-08 | Public API payload/log/analytics inspection | No raw visitor GPS retained by default; exact listing coordinates not exposed in public payloads by default |
| GPS-09 | Old listing lacks GPS | Backfill workflow identified; upgraded publication gate enforced at planned cutover; no invented coordinates |
| GPS-10 | Near Me on a slow connection or with cached results | Compact paginated list without map dependency; cached age/search area clear |

## Low-bandwidth and unreliable-network gates

Initial synthetic conditions: 400 kbps down / 150 kbps up / 400 ms RTT; stress condition 150 kbps down / 75 kbps up / 800 ms RTT. Also test offline/reconnect transitions and a real low-end Android device with Cameroon pilot users. These profiles are test assumptions, not regional network statistics.

| ID | Scenario | Expected result |
|---|---|---|
| NET-01 | Cold search under initial shaped profile | Readable results target <=5 seconds without awaiting images; record actual timing and bytes |
| NET-02 | Initial 12-result search | Compressed JSON <=25 KB; thumbnails <=30 KB each; only near-viewport images requested |
| NET-03 | Open detail and gallery | Detail fetched on demand; normal image <=150 KB; larger images only on explicit need |
| NET-04 | Public web cold entry | Initial-route JS <=200 KB compressed; no mandatory remote font/icon fetches |
| NET-05 | Disconnect while viewing cached public results | Usable cached text; last-update/offline indication; no false empty-result screen |
| NET-06 | Submit search rapidly or reconnect repeatedly | Obsolete requests cancelled; bounded retries; final query wins; no analytics retry storm |
| NET-07 | Interrupt upload of several images | Draft survives; completed uploads retained; only failed image retried; pending state clear |
| NET-08 | Timeout after server accepts inquiry/review/report | Retry with same idempotency key does not duplicate the operation |
| NET-09 | Cached presigned image URL expires | URL refreshed with bounded retry; page remains usable; no entire-list refetch loop |
| NET-10 | Offline analytics queue reconnects late | Events deduplicated; occurrence time retained; expired queue bounded; UI never blocked |
| NET-11 | Deny location permission, storage quota full, switch account | Manual area/city search works; graceful cache failure; private drafts not leaked across accounts |
| NET-12 | Provider/listing suspended while client has cached content | Cached state labeled as potentially stale; server rejects disallowed actions; reconnect refresh removes ineligible listing |

Budgets are proposed release targets to measure and adjust explicitly, not guarantees already achieved.

## Operations and release gates

| ID | Scenario | Expected result |
|---|---|---|
| OPS-01 | Core Compose stack starts on PC | Health checks pass without production credentials or external mail delivery |
| OPS-02 | Deliberate API error | Correlation ID links structured log in OpenSearch to metrics/Grafana; secrets redacted |
| OPS-03 | Node/app scrape and missing target | Expected Prometheus targets; failure alert visible; Linux VM metrics correctly labeled |
| OPS-04 | Swarm deployment rehearsal | Prebuilt pinned images; working Traefik service routes; persistent data remains attached |
| OPS-05 | Cloudflare external smoke test | Intended public routes work; private data/search/monitoring endpoints inaccessible |
| OPS-06 | Release migration + OVH deploy + rollback rehearsal | Exact approved artifacts, safe migration ordering, backup recovery and post-deploy checks |
| OPS-07 | Promote to main | Matches successfully deployed release; deployment/tag records reference both repos and image digests |

Failure evidence accompanies each feature PR. User local testing is recorded before merging to release; cloud checks precede promotion to main.
