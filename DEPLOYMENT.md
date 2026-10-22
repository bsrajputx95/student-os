# Vercel presentation deployment

This deployment preserves the full student/staff application and populated fictional HKBK campus. It is a presentation environment, not an institution's operational student-record service.

Public site: **https://studentos-hkbk.vercel.app**. Source: **https://github.com/bsrajputx95/student-os** (private). Both shorter requested Vercel addresses were already assigned; the selected HKBK address is verified and attached to this project.

## Architecture

- Vite builds static UI/assets for Vercel's CDN, including a content-hashed, sanitized public learning catalog. Imported opportunity records arrive separately with authenticated state. `/api/*` runs the existing Node 24 application through `api/index.mjs`.
- A fresh build creates exactly 400 fictional students and 100 fictional staff from source. It never copies the local `data/` database, personal accounts, messages, sessions, uploads or `.env` into the deployment.
- Private Vercel Blob stores an immutable compressed SQLite checkpoint plus a versioned changeset journal. Each request strongly reads the small conditional head (`useCache:false`); a warm function reuses its temporary database and applies only new journal entries. Small changes are stored inline in one conditional head write; larger changes use integrity-checked immutable objects. Success and cookies are withheld until the head is durable. Competing writers receive 409 rather than overwriting accepted changes. The journal compacts at 128 entries or 2 MB of compressed changes; previous checkpoints are retained.
- Warm functions serialize their own requests. Separate functions still use ETag conflict detection. This preserves low-volume presentation interactions; it is not a high-concurrency database architecture.
- File contents are stored privately inside the hosted snapshot. Hosted attachments are limited to 3 MB each and 10 MB total. Snapshots are bounded to 24 MB compressed / 80 MB expanded. Local operation keeps its existing disk storage and limits.
- Hosted updates poll every 30 seconds while the tab is visible and refresh on window focus. The local single-worker service retains SSE. Scheduled publication/reminders are processed on requests; no always-running cloud scheduler is claimed.
- Quid credentials remain server-only Vercel secrets. Shared presentation AI limits are 40 requests/hour and 200/day, in addition to normal application limits. External mail and trusted multi-language execution remain unconfigured unless their adapters are supplied.

## Required environment

`STUDENTOS_PRESENTATION=1` explicitly allows the fictional campus with production HTTPS/cookie/origin/CSP protections. Ordinary production mode still rejects sample stores. `APP_ORIGIN` must be the final public HTTPS origin. Vercel-provided deployment/branch origins are also allowed for this project; arbitrary request Host values are never trusted.

Connect a **private** Blob store with `BLOB_READ_WRITE_TOKEN`. Configure `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL` and optional `GEMINI_FALLBACK_MODELS` as server-side secrets to enable live Gemini. Never use `VITE_` secret names. Preview and production use separate checkpoint/journal paths in the same project store.

The GitHub repository contains application source, fictional fixture generators, tests and public assets. Local configuration, runtime data, build output, snapshots and Vercel credentials are ignored. `npm run build:vercel` regenerates the initial snapshot; deploying a new version does not replace an existing cloud campus snapshot.

## Validation and operation

Run `npm run verify` before release. Hosted tests cover parsed request bodies, strong conditional reads/writes, cold initialization races, durable login, withheld success/cookies on storage failure, concurrent writer conflicts and private attachment ownership. After deployment verify a student login, progress/save, cold refresh, faculty access, source-linked learning and a real Quid answer. A successful static build alone does not verify the backend.

Keep the Blob store private. Back up the cloud snapshot through an authenticated operator tool before deleting a deployment resource or changing snapshot format. Do not remove the store to reset a presentation without retaining its current snapshot. A real college rollout needs a managed transactional database/object storage, workers/scheduler, institution enrollment and separate operational/privacy reviews; see `OPERATIONS.md`.

## Verified release, 21 October 2026

All **134 tests** passed, the 168-module source check passed, and Vercel's Node 24 production build reached READY. `npm audit` reported zero known vulnerabilities after updating the affected development dependencies. This is an audit snapshot, not an independent security certification.

Unauthenticated HTTPS checks returned 200 for the UI, health, campus summary, local font and isolated practice runner. The public campus has 400 students and 100 staff. Student and faculty password login worked. A lesson bookmark survived a full reload and the next deployment; the server SQL runner scored the reference query 100 across three fresh datasets. Faculty Quid returned a live AI answer with 19 fourth-year DSA candidates, named scores and an associated calculated report. The teacher roster displayed 40 paginated rows with no horizontal overflow at 1366×900. No runtime errors were returned for the final deployment during the focused verification window.

The current deployment was uploaded using the authenticated Vercel CLI. Automatic GitHub push deployments are **not connected**: Vercel requires a GitHub Login Connection on the account. After linking GitHub in Vercel account settings, run `vercel git connect https://github.com/bsrajputx95/student-os.git --yes` from this checkout. The CLI's GitHub authorization also lacks workflow-write scope; the tested CI recipe is provided as `scripts/github-ci.example.yml` rather than an active GitHub workflow. No successful hosted CI run is claimed. Manual release remains `vercel deploy --prod --yes`.

## UI and performance update, 22 October 2026

The UI now uses white navigation, readable ink text, saturated purple/blue feature panels, color-coded progress cards, and a compact real-data journey preview. The faculty hero shows actual campus counts. Phone layouts retain accessible navigation and readable filters. Perpetual orbit animations, per-frame counter renders, and whole-page mutation/reveal scans were removed; restrained route and hover motion respect reduced-motion preferences.

The initial library is now a hashed CDN JSON asset. Strict Mode/focus refreshes share in-flight library/state requests, and state no longer transfers every campus follow relationship; directory records retain accurate public counts and the full event archive stays available. The upgrade copies the existing live snapshot into a new immutable checkpoint before publishing the journal head. It does not replace it with the build seed, and the previous v1 cloud snapshot is retained as a recovery source. Rollback must replay the latest journal into a snapshot; deploying the older v1 handler alone would show older data.

Verification: 142 tests passed, including cold replay, conditional writer conflicts, failed-save cookie withholding, checkpoint retention, static catalog answer-key boundaries, and imported-job merging. A seven-start-date regression also prevents practical labs from disappearing onto rest/checkpoint days. See PERFORMANCE.md for measured public-release timings and limitations.
