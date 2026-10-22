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
