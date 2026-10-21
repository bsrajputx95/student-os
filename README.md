# StudentOS

A connected student and college website built with React, Vite, a Node HTTP API and persistent SQLite. Students learn, practise, follow a preparation journey, build a portfolio and track opportunities. Teachers and placement staff publish work, review evidence and support the same students. Community and messages are shared across both workspaces.

## Run locally

Node 24 is the tested runtime.

```powershell
npm ci
npm run dev
```

- Website: `http://127.0.0.1:5180`
- API and built website: `http://127.0.0.1:5080`
- `npm run build` regenerates the assessment ZIPs and builds the website; `npm start` serves that bundle.
- `npm run verify` runs syntax/scope checks, tests and build.
- `npm run load:check` measures a disposable local fixture; it never uses the persistent campus.

Current implementation and unfinished product work are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). Deployment, institution setup, backup/restore and service contracts are in [OPERATIONS.md](OPERATIONS.md). [PROJECT_AUDIT.md](PROJECT_AUDIT.md) preserves the original approved backlog, not the current status.

The Vercel presentation deployment uses a separate generated campus with durable private cloud snapshots. It preserves the local SQLite service and does not publish local user data. Configuration, consistency and presentation limits are described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Explore the populated campus

The local **HKBK College of Engineering** sample has 400 students (100 per year) and 100 staff: 80 teachers, 10 placement officers, nine support accounts and one administrator. Older workspaces outside the college are preserved.

| Workspace | Username | Local sample password |
| --- | --- | --- |
| Fourth-year candidate | `bhavanisingh` | `12345678` |
| Teacher | `neha.faculty` | `12345678` |
| Placement coordinator | `arjun.placements` | `12345678` |
| College administrator | `hkbk.staff.091` | `12345678` |

Other students use `hkbk.y1.001` through `hkbk.y4.100`; the first fourth-year student is Bhavani. Community → People lists staff handles. Public account creation makes a fresh student with no earned achievements and a setup flow. Production registration remains pending until a college administrator approves it; public registration cannot create staff.

Bhavani has nearly finished a full 1,460-day sample journey with 1,474 practice problems, four completed projects, 160 historical quiz records and a multi-year activity history. The campus includes over 1,000 posts, 116 past/upcoming events, 24 simulated preparation drives, linked coursework, guidance and varied academic/readiness levels. Backlog/graduation fields support testing placement eligibility.

**All sample people, academic records, posts, events, hiring stages and outcomes are fictional.** They are not official HKBK data or evidence of employer partnerships. Sample history and scores are labelled illustrative; they are not reconstructed verified assessments. A versioned presentation-content upgrade adds 32 linked discussions and 12 detailed workshops without resetting earned progress or user edits. Dataset upgrades retain edits. Production refuses a store containing these sample accounts. No external employer application or message is sent by exploring the sample campus.

## Student workspace

- **Overview and Journey:** exact next activities, year/track/experience/language preferences, diagnostic, daily time budget, catch-up queue, spaced review and exam/recovery breaks. Fresh fourth-year students start with 150 calendar days; years 1–3 default to 1,460/1,095/730. Students can set a deadline. Existing long demo histories stay intact. The scrollable map renders a window of days.
- **Practice:** 3,300 attributed LeetCode metadata entries, topic/difficulty/search filters, six local JavaScript function exercises, quizzes/aptitude, 60 company profiles with official hiring/career resources and college challenges. A saved practice lens filters by 15 career roles, year-aware level and skill gaps; each role has an original scored scenario bank. AI interview preparation is also available directly in Practice, with role-specific prompts. Switching this lens does not reset the student’s main preparation journey. External practice stays self-reported. The server-coding tab has a clearly disconnected state until an isolated runner is supplied.
- **Assessment lab:** five original debugging projects (webhook replay, refund precision/limits, inventory atomicity, retry backoff and tenant isolation), downloadable multi-file starter ZIPs, editable browser solutions, six executable SQLite labs, timed sessions, drafts, explanations and saved results. Project checks are browser practice. SQL is checked against fresh datasets in a disposable server process with time/concurrency limits.
- **Learn:** 12 courses / 158 distinct original lessons, worked examples and scored checks; 12 illustrated course previews and 24 saved official learning paths; automatic StudentOS course completion certificates with authenticated SVG downloads and print/PDF layout; 52 quiz sets / 247 questions; saved lesson drafts, notes/bookmarks, nine project templates, project evidence/review, teacher work and sourced certificate suggestions with a self-reported credential wallet. Companion videos are labelled; chapter playback tracking is not implemented.
- **Career:** dated sourced opportunities, year/skill fit and freshness, application notes/round history/next actions, saved role-specific interviews, project evidence, factual resume entries and role versions/history/restore. Resume AI proposes reviewable changes; generated claims never apply automatically.
- **Community, Messages and Events:** shared student/staff feed, bottom composer, year badges, student profiles, follows/likes/replies, college announcements, event updates, lounge and DMs, unread state, search, report/block/mute/moderation, event teams/cancellation/attendance and calendar export.
- **Progress and Help:** GitHub-style heatmap, evidence-based skill history/readiness, searchable help, private college support conversations and own-data export.

Work updates the matching task and canonical history. Completing the current plan advances the traveller at most once per date. Effort XP, activity, quiz scores, verified mastery and job readiness have different meanings. Scored checks/reviews supply evidence; checking a project milestone or recording external practice does not manufacture verified readiness.

## Teacher, placement and administration

Teachers can filter students by year, department, track, readiness and preparation needs, inspect academic evidence and resumes, save cohorts and publish to a reviewed individual/cohort/bulk audience. Teacher-authored quiz banks are versioned and assignment questions are frozen; drafts deliver nothing. Publishing supports schedules, files, lab requirements, timer/attempt policy and extensions.

Students submit drafts and immutable versions with owned files. Staff review using rubric criteria, feedback and revision requests; reviews update the same student's work and readiness evidence. Mentor interventions keep baseline/outcome/status and follow-up dates. College challenges have eligibility, entry windows, server-timed attempts, saved answers, grading jobs and ranked results.

Placement staff can create/edit/close/cancel drives, filter verified CGPA/backlogs/branch/graduation eligibility, review exclusion reasons, schedule rounds and apply validated bulk stage changes. These changes appear in student application timelines. Reports include date/cohort filters, evidence, funnels, interventions and CSV export.

Administrators manage invitations, roster previews/imports, pending enrollment, roles, suspension and academic corrections. Support accounts can help with academic visibility, moderation and private tickets without acquiring teacher publishing/review rights. Sessions expire on the server and can be revoked. Private DMs are excluded from academic staff records. Sensitive staff actions are permission-checked within the college and audited.

## External services and content

Copy `.env.example` to `.env` and configure only the services being activated. Secrets stay server-side; never use `VITE_` for credentials. See [OPERATIONS.md](OPERATIONS.md) for the AI, mail, opportunity-feed and trusted-runner request/response contracts and acceptance checks.

Quid uses server-authorized academic records: the student’s own preparation, learning, scored attempts, coursework, projects and career history. Faculty can select or name an in-college student, review factual summaries and navigate to that student; ambiguous names require a choice. Private DMs and credentials are excluded. Without a provider, direct saved-record summaries, navigation and guided interviews work, but no AI review/score is claimed. Native Gemini and OpenAI-compatible providers are supported; live responses have not been verified in this workspace. AI interviewing can include selected resume/project/job context. Multi-language judging requires a separately isolated runner; only its contract has been tested here. Account email delivery, authorized feeds, GitHub/LeetCode sync and deployment are not live in this workspace.

The interface uses a brighter violet/blue palette, stronger text contrast, responsive practice/interview layouts and a new SVG favicon. Sixty-one company logos and 128 illustrated profile portraits are stored locally with source attribution in [BRAND_ASSETS.md](BRAND_ASSETS.md) and [ASSET_SOURCES.md](ASSET_SOURCES.md).

There are 94 distinct sourced opportunity records after an additional 60-posting employer-board import on 21 October 2026 (one duplicate preserved its existing application ID). See [EMPLOYER_SOURCES.md](EMPLOYER_SOURCES.md). Year and skill filters on imported records help exploration; exact eligibility remains on the employer posting.

The original imported catalog was checked **19 October 2026** and remains a snapshot unless an authorized feed/import refreshes it. Listings may close; original pages remain authoritative. Company themes are preparation suggestions, not assertions about interview questions.

Sources include [LeetCode public metadata](https://leetcode.com/problemset/), original employer pages linked on each opportunity, attributed Internshala results and [Hacktoberfest official resources](https://hacktoberfest.com/). No premium problem statements are copied. Assessment exercises and lesson content are original; [HackerRank project format](https://support.hackerrank.com/articles/1053996435-validating-a-project-for-front-end%2C-back-end%2C-and-full-stack-questions) and [HackerEarth SQL format](https://help.hackerearth.com/hc/en-us/articles/360002360393-sql) informed the exercise types. These links do not imply affiliation.

`shared/content/` holds attributed snapshots; `server/model.mjs` owns learning transitions, with separate campus, community, challenge, evidence, interview, career and operational services. Six schema migrations add normalized indexes/records, while some domain aggregates remain JSON. The current architecture targets a controlled single-instance college pilot. Full hosted environments, deeper multi-year track content, external account sync and production hosting remain separate work, detailed in the ledger.

The reference repository remains isolated; its application source was not reused.
