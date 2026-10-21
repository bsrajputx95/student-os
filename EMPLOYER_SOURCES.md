# Imported employer opportunities

The snapshot in `shared/content/employer-opportunities.json` was retrieved on **21 October 2026**. It contains **60 genuine published posting records** from five employer public Greenhouse boards: **31 internships, one apprenticeship and 28 full-time roles**. Eight records name an India location. These are a dated exploration catalog; a listing can change or close after retrieval.

Only titles, public department/location metadata, identifiers, source dates and source URLs are retained. Descriptions are short original StudentOS summaries. Full adverts, salaries, application forms, resumes, candidate details and internal hiring records are not stored. There are no invented openings or claimed campus partnerships.

| Employer | Imported | Official origin | Public metadata endpoint |
| --- | ---: | --- | --- |
| Stripe | 31 | [Official role search](https://stripe.com/careers/search) embeds Greenhouse IDs. Imported IDs are cross-checked against this page. | [Stripe metadata](https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=false) |
| Cloudflare | 5 | [Official open positions](https://www.cloudflare.com/careers/jobs/) loads a careers component that identifies the Cloudflare Greenhouse API. The importer resolves that component from the current page. | [Cloudflare metadata](https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs?content=false) |
| Databricks | 12 | [Official open positions](https://www.databricks.com/company/careers/open-positions); employer-hosted job URLs are supplied by the API. A current employer job title and ID are cross-checked before import. | [Databricks metadata](https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=false) |
| MongoDB | 6 | [Official job search](https://www.mongodb.com/company/careers/see-jobs) embeds its MongoDB public Greenhouse feed. | [MongoDB metadata](https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=false) |
| Figma | 6 | [Official careers page](https://www.figma.com/careers/) links directly to its Figma Greenhouse postings. | [Figma metadata](https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=false) |

The [Greenhouse Job Board API documentation](https://docs.greenhouse.io/job-board.html) describes the public GET endpoints. Import requests use `content=false`. The public departments endpoint supplies department names and job IDs without requesting full descriptions. Twilio was reviewed but excluded: its official careers destination now uses a different platform, so an old Greenhouse board was not treated as current evidence.

## Selection and interpretation

Titles are screened for intern/internship, graduate/new grad, apprentice/apprenticeship, early career, university, engineer I or associate. Senior/staff/lead/principal/manager/director roles, legal/recruiting/HR/sales/marketing roles, PhD-only titles, high-school internships and engineer-II/TSE-II titles are excluded. A title-screened associate role can still require experience; no entry-level eligibility is inferred from its title.

Internships/apprenticeships use years 1–4 for exploration and full-time roles use year 4. These filters are not employer eligibility rules. Every imported record directs students to check degree, graduation window, experience, location, availability, language and work authorization at the source. Skills are title-based StudentOS preparation tags and are explicitly identified as such, not claimed employer requirements. Countries are normalized from recognizable published location text; multi-country locations remain multi-country, and unrecognized locations retain a source-check label.

## Refresh and merge

Run `node scripts/import-employer-opportunities.mjs` from the app folder. The importer makes GET requests only, checks official origins and source URL hosts, imposes response/time limits and imports at most 60 records. Records are selected round-robin across employers, with technical titles and India locations prioritized within each board. All required sources must succeed before the snapshot is atomically replaced; failures preserve the prior snapshot.

The script exports `importEmployerOpportunities({limit})` for a bounded refresh and pure `mergeEmployerOpportunities(base, imported)` for a safe catalog merge. The merge deduplicates by normalized employer plus posting ID, including existing `gh_jid` and numeric employer listing URLs. Existing curated records and stable application IDs win over generic imported metadata. Merging the current 35-entry base catalog with this snapshot yields **94 distinct records**, because one Stripe posting already exists. The merge is idempotent and does not edit student applications or persistent campus data.

The JSON uses the existing jobs-array schema, including `type: "Full-time"`. Additional provenance fields are `retrievedAt`, `sourceBoard`, `sourcePostingId`, `sourceUpdatedAt`, `sourcePublishedAt`, optional `department` and `skillBasis`. Refreshing this file does not itself create an automatic recurring sync or submit an employer application.
