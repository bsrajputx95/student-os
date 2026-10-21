# Vercel presentation deployment

This deployment preserves the full student/staff application and populated fictional HKBK campus. It is a presentation environment, not an institution's operational student-record service.

## Architecture

- Vite builds static UI/assets for Vercel's CDN. `/api/*` runs the existing Node 24 application through `api/index.mjs`.
- A fresh build creates exactly 400 fictional students and 100 fictional staff from source. It never copies the local `data/` database, personal accounts, messages, sessions, uploads or `.env` into the deployment.
- A private Vercel Blob stores a compressed SQLite snapshot. Each request reads the latest object with `useCache:false`, runs against a private temporary database, and conditionally saves changes using the original ETag. Success responses and session cookies are released only after saving. Competing writers receive 409 and must refresh/retry; no accepted write silently overwrites another.
- Warm functions serialize their own requests. Separate functions still use ETag conflict detection. This preserves low-volume presentation interactions; it is not a high-concurrency database architecture.
- File contents are stored privately inside the hosted snapshot. Hosted attachments are limited to 3 MB each and 10 MB total. Snapshots are bounded to 24 MB compressed / 80 MB expanded. Local operation keeps its existing disk storage and limits.
- Hosted updates poll every 30 seconds while the tab is visible and refresh on window focus. The local single-worker service retains SSE. Scheduled publication/reminders are processed on requests; no always-running cloud scheduler is claimed.
- Quid credentials remain server-only Vercel secrets. Shared presentation AI limits are 40 requests/hour and 200/day, in addition to normal application limits. External mail and trusted multi-language execution remain unconfigured unless their adapters are supplied.

## Required environment

`STUDENTOS_PRESENTATION=1` explicitly allows the fictional campus with production HTTPS/cookie/origin/CSP protections. Ordinary production mode still rejects sample stores. `APP_ORIGIN` must be the final public HTTPS origin. Vercel-provided deployment/branch origins are also allowed for this project; arbitrary request Host values are never trusted.

Connect a **private** Blob store with `BLOB_READ_WRITE_TOKEN`. Configure `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL` and optional `GEMINI_FALLBACK_MODELS` as server-side secrets to enable live Gemini. Never use `VITE_` secret names. Preview and production use separate snapshot paths in the same project store.

The GitHub repository contains application source, fictional fixture generators, tests and public assets. Local configuration, runtime data, build output, snapshots and Vercel credentials are ignored. `npm run build:vercel` regenerates the initial snapshot; deploying a new version does not replace an existing cloud campus snapshot.

## Validation and operation

Run `npm run verify` before release. Hosted tests cover parsed request bodies, strong conditional reads/writes, cold initialization races, durable login, withheld success/cookies on storage failure, concurrent writer conflicts and private attachment ownership. After deployment verify a student login, progress/save, cold refresh, faculty access, source-linked learning and a real Quid answer. A successful static build alone does not verify the backend.

Keep the Blob store private. Back up the cloud snapshot through an authenticated operator tool before deleting a deployment resource or changing snapshot format. Do not remove the store to reset a presentation without retaining its current snapshot. A real college rollout needs a managed transactional database/object storage, workers/scheduler, institution enrollment and separate operational/privacy reviews; see `OPERATIONS.md`.
