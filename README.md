# StudentOS

StudentOS brings student preparation and college coordination into one workspace. Students practise for their target role, follow a study plan and track coursework and applications. Teachers and placement teams work with the same academic records.

[Open StudentOS](https://studentos-hkbk.vercel.app/) · [Local setup](#development) · [Deployment](DEPLOYMENT.md)

## Student workspace

- **Preparation plan:** year- and role-based schedules, daily activities, study breaks, catch-up work and a scrollable journey map.
- **Practice:** 3,300 sourced problem listings, 15 role filters, topic quizzes, college challenges, SQL assessments and downloadable debugging projects.
- **Learning:** 12 courses with 158 lessons, scored checks, course previews, notes, bookmarks and completion certificates.
- **Career:** company preparation, sourced opportunities, application tracking, projects, resume versions and job-specific readiness.
- **Community:** a shared student/staff feed, college announcements, events, follows, direct messages and campus chat.
- **Quid:** contextual AI assistance for navigation, study guidance, resume suggestions and interview preparation.

Practice, lessons, reviewed work and project milestones update the student's activity and preparation record. Self-reported effort is kept separate from assessed work.

## College workspace

Teachers can publish assignments, quizzes and projects to a student, cohort or college audience. Submissions retain their versions, feedback, rubric scores and revision requests.

Placement teams can review skill gaps, recommend opportunities, apply eligibility rules and manage recruitment drives. Administrators manage enrollment and roles; support staff handle college support conversations. Academic access is scoped to the college, and private direct messages are excluded from staff academic views.

## Development

Use **Node.js 24**.

```sh
npm ci
npm run dev
```

The website runs at `http://127.0.0.1:5180`; the API runs at `http://127.0.0.1:5080`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and Vite development server |
| `npm run verify` | Run source checks, tests and the production build |
| `npm run build` | Build assessment kits and the website |
| `npm start` | Serve the built website and API on port 5080 |
| `npm run format` | Format JavaScript and check identifier scope |
| `npm run load:check` | Measure an isolated local fixture |

Copy `.env.example` to `.env` when connecting external services. Credentials belong on the server; never use a `VITE_` prefix for secrets. Quid supports Gemini and compatible chat-completion providers. See [OPERATIONS.md](OPERATIONS.md) for provider, mail, opportunity-feed and isolated runner configuration.

## Sample campus

The presentation uses a fictional HKBK College of Engineering dataset with 400 student profiles and 100 staff profiles. People, academic histories, college posts, events and placement outcomes are sample records, not official college data or employer partnerships. External opportunities retain their source links.

| Workspace | Username | Sample password |
| --- | --- | --- |
| Student | `bhavanisingh` | `12345678` |
| Teacher | `neha.faculty` | `12345678` |
| Placement | `arjun.placements` | `12345678` |
| Administrator | `hkbk.staff.091` | `12345678` |

A new student account starts with an onboarding flow and no earned achievements. Staff accounts are provisioned by the college. Institution mode requires enrollment approval and a separate store; sample accounts require explicit presentation configuration in production.

## Architecture

| Area | Implementation |
| --- | --- |
| Frontend | React 19, Vite, route splitting and locally served assets |
| API | Node.js HTTP services with server-side sessions and permissions |
| Local storage | SQLite, versioned migrations and indexed academic records |
| Hosted storage | Private SQLite checkpoints and conditional changeset journals |
| Hosting | Vercel CDN and Node.js functions |
| AI | Server-side provider adapters with scoped academic context |

`src/` contains the student and college interfaces. `server/` owns authentication, learning transitions, assessments, community and college services. `shared/` contains public metadata and shared rules. `tests/` covers academic progress, access control, storage and integration contracts.

The public content library is a hashed CDN asset. Cloud saves publish incremental changes and withhold success responses until storage accepts them. See [PERFORMANCE.md](PERFORMANCE.md) for measured timings and storage limits.

## Documentation

- [Operations and service setup](OPERATIONS.md)
- [Deployment and release process](DEPLOYMENT.md)
- [Implementation status and remaining work](IMPLEMENTATION_STATUS.md)
- [Performance measurements](PERFORMANCE.md)
- [Profile and learning asset sources](ASSET_SOURCES.md)
- [Company logos and brand sources](BRAND_ASSETS.md)
- [Employer data sources](EMPLOYER_SOURCES.md)

Source-linked listings are dated snapshots and may close. Provider content and trademarks remain with their owners. The presentation does not claim employer affiliation, official college records or verified placement outcomes. Institution rollout requires the operational work recorded in the implementation status.
