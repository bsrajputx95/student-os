# StudentOS performance update — 22 October 2026

## Root causes and changes

- Every login, bookmark and other small write previously compressed/uploaded the entire approximately 4.8 MB campus snapshot. The new private storage format checkpoints the existing campus once and publishes small SQLite changesets through a conditional head. Typical small writes require one small conditional upload. Warm functions retain their database; cold instances replay integrity-checked changes. Compaction bounds history and retains old recovery checkpoints.
- The public learning catalog previously waited behind authenticated database traffic. Its identical sanitized public shape is now a content-hashed CDN asset (approximately 190 KB gzip); imported jobs remain live through state overlays. No scoring modules are bundled in the browser.
- The full campus follow graph was repeated in every state response. The response now includes the viewer's connections and correct counts for other members, plus 25 initial posts with server pagination for the rest. All people and the full event archive remain accessible.
- In-flight library/state requests are shared; account epochs prevent sharing state across logins. Removed recurring counter renders, permanent orbit effects and whole-page mutation/reveal scans. Route bundles, gzip, source checks and authentication protections remain.

## Verification

141 tests pass. New cases exercise durable cold replay, failed saves, concurrent writers, integrity checks, compaction recovery objects, catalog answer-key exclusion and imported-job preservation. Desktop student/faculty flows and a 390-pixel phone viewport were checked in the browser; the roster retained 40 paginated rows without page overflow. A calendar regression found during verification is covered for all seven joining weekdays.

The public before/after timings are recorded below after the release is live. Measurements are a focused sample from the same machine, not a load test or a latency guarantee. A cold server still needs to fetch the immutable checkpoint; AI provider time and network conditions can vary. The private Blob architecture remains appropriate for this presentation scale. A production campus rollout needs a managed transactional database and workers, as described in OPERATIONS.md.

## Baseline

On the previous public deployment: catalog 2,141 ms; sign-in 6,978 ms; state reads 755 / 447 / 660 ms. The student state response was 882,172 decoded bytes.

## Verified public release

Deployment: `studentos-f79tyinne-soulwallet1-6234s-projects.vercel.app`, aliased to `studentos-hkbk.vercel.app`, source commit `f1da34e`. All responses below returned HTTP 200. Timings include response-body transfer and decoding from the same local machine as the baseline, using Node fetch with compression negotiation.

| Operation | Before | After | Result |
| --- | ---: | ---: | --- |
| Student sign-in | 6,978 ms | 2,082 ms | 70.2% less time in this sample |
| Initial public catalog | 2,141 ms through API | 1,003 ms through CDN | 53.2% less time; subsequent browser loads can reuse the hashed asset |
| Student state, decoded size | 882,172 bytes | 586,774 bytes | 33.5% smaller |
| Warm state reads | 755 / 447 / 660 ms | 736 / 562 / 715 ms | Roughly similar; no read-latency improvement claimed |
| Bookmark save / verify / restore | Not sampled | 2,254 / 519 / 3,732 ms | Durable write verified, test change restored |
| Faculty sign-in / roster | Not sampled | 2,341 / 1,486 ms | All 400 students retained |

The first health request after deployment took 1,599 ms. The pre-existing `devops:11` bookmark survived the storage upgrade. Bhavani's readiness remained 98 and the live journey advanced normally to day 1,439. No campus reset was performed. The faculty roster still includes substantial delivery history; broader endpoint pagination and a transactional database remain the next scaling step, rather than a claimed completed production migration.

Actual student dashboard, mobile practice, faculty overview and mobile/desktop roster were checked visually. The public dashboard loads with the new theme, retains its real daily task links and has no horizontal page overflow at the tested phone width.

## Journal response validators

The journal head requests `Accept-Encoding: identity` when reading private Blob storage. This keeps the response ETag usable for conditional writes even when the head grows large enough for HTTP compression. A regression test covers a compressed response returning a weak variant ETag. A hosted login, bookmark save, subsequent read and restoration were verified after the correction.

## Expanded roster · 22 October 2026

The campus now has 800 students and 100 staff. Social follower/post/unread counts are computed in single passes instead of repeatedly scanning each collection for every person. The disposable 900-person fixture served 50 state requests at concurrency 5 with no failures: p50 106 ms, p95 111 ms, max 116 ms; the average decoded response was 763,237 bytes. Catalog gzip and conditional 304 passed. These are local measurements; they do not establish hosted capacity.

The main browser bundle is approximately 401 KB / 126 KB gzip. New duotone icons are a 17 KB locally served SVG sprite rather than a runtime icon-package import. Six responsive course photographs total approximately 631 KB on disk; browsers select the appropriate image size and load cards lazily. Current verification covers 150 passing tests and 182 source modules.

## Browser caching · 22 October 2026

A production-only service worker reuses the public app shell, hashed route chunks, sanitized public course/problem catalog, local fonts, company marks, profile illustrations and course photographs. Warming starts after the initial workspace response, uses three concurrent fetches, and respects browser Data Saver / 2G hints. It never intercepts `/api/`, non-GET requests, the isolated code runner, authenticated files or third-party video requests. Storage failures fall back to normal network loading. Updates wait for an explicit Reload action; the previous public cache remains available to existing tabs.

IndexedDB retains at most one student's own learning summary (six-hour lifetime, 2 MiB ceiling). A minimal no-store session identity endpoint validates the current account before displaying it; the full authoritative state then refreshes in the background. The saved view blocks writes until refresh succeeds. Faculty rosters, conversations, AI history, resume contact details and active assessment/interview sessions are excluded. Sign-out, session expiry and account switches clear the saved summary and invalidate stale requests; tabs synchronize session changes without sharing credentials.

Browser verification on a disposable 900-person campus introduced a deliberate 3.5-second delay to `/api/state`: the saved dashboard remained visible during refresh. A repeat load made no server requests for JavaScript, CSS, catalog or cached image assets. Student switching displayed Pranav Nair's own summary rather than Bhavani Singh's; sign-out removed the private view in a second tab immediately. Applying a waiting service-worker update reloaded successfully. These are local functional checks, not a hosted latency guarantee. Initial downloads, server cold starts, Quid generation, messages and durable saves still require network/server work. The cloud database remains the source of truth; this is not an offline submission queue or database scaling solution.

## Text readability · 23 October 2026

Legacy desktop and responsive CSS declarations below 12 px now use a 12 px minimum. Body descriptions use 14 px where appropriate, with 13 px secondary copy and filters. A shared readability layer darkens career recommendations, source notes, student/staff metadata, messages, assignment feedback and report labels. Course covers retain light text at full opacity, and the separate dark-editor palette remains last in the style imports.

The production bundle was checked in a disposable local campus across 25 student/staff views, four open dialog states, six 500 px narrow layouts, and the project and SQL lab workspaces. The checks found no remaining sub-12 px active HTML text, insufficient contrast on measured solid backgrounds, or root-page horizontal overflow in those 37 states. Normal text used a 4.5:1 contrast threshold; large text used 3:1. Disabled controls, gradients, image backgrounds and SVG artwork are outside that automated check. Career, course, staff overview and narrow career screenshots were also reviewed visually; these checks are not an independent accessibility certification. Backend data, permissions and grading behavior are unchanged.
