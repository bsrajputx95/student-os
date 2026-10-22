# Profile illustrations

StudentOS stores 128 locally served illustrated profiles in `public/avatars/`. They represent fictional campus accounts; no photographs or personal information were used. The deterministic `avatarForPerson(person)` helper selects an image by account ID, handle or name so each person keeps the same illustration across the interface.

The artwork is [Notionists](https://www.dicebear.com/styles/notionists/) by [Zoish](https://bio.link/heyzoish), served through DiceBear's documented version 10 SVG API and dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). DiceBear's [license inventory](https://www.dicebear.com/licenses/) lists this style under CC0. Neither artist nor DiceBear endorses StudentOS.

`shared/content/avatar-assets.json` records each image's exact source URL, fictional seed, creator, retrieval date, size and SHA-256 digest. `node scripts/import-profile-assets.mjs` imports the set, reuses validated existing files, retries transient failures and fails without replacing the manifest when any asset is missing. No runtime avatar request goes to a third-party service.

The importer rejects scripts, event handlers, active SVG elements, external image or paint references, embedded content and oversized SVGs. Local fragment references used by the original artwork are allowed.

## Learning library

Course cover layouts, preview outlines, chapter presentation and certificate artwork are original StudentOS code-native visuals. Cover photography is locally stored and attributed below. Twenty-four external learning-path cards use original short summaries and link directly to the providers. The metadata import stores only source URL, resolved URL, page title, response status and retrieval time; it does not rehost course texts, paywalled videos or provider credentials. All 24 source links returned HTTP 200 on 21 October 2026, recorded in `shared/content/learning-sources.json`.

Primary sources include [MDN curriculum](https://developer.mozilla.org/en-US/curriculum/core/), [React](https://react.dev/learn), [Python](https://docs.python.org/3/tutorial/), [PostgreSQL](https://www.postgresql.org/docs/current/tutorial.html), [Docker](https://docs.docker.com/get-started/), [Kubernetes](https://kubernetes.io/docs/tutorials/kubernetes-basics/), [GitHub Learn](https://learn.github.com/), [PortSwigger Academy](https://portswigger.net/web-security), [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course), [Microsoft Learn](https://learn.microsoft.com/en-us/training/career-paths/data-analyst) and [IBM SkillsBuild](https://skillsbuild.org/learning-catalog/university-catalog). Provider enrollment, content and credential terms remain with each provider.

Refresh source metadata with `node scripts/import-learning-resources.mjs`. Courses have 12 local previews; exact video chapters have not been added. The pre-existing JavaScript companion video remains separate from saved lesson-check progress.

The subject illustration set now contains twelve original SVG scenes: component orbits, a terminal, relational storage, a tree, Python flow, deployment cubes, distributions, a model network, analytics, Linux, a request globe and a service graph. They are rendered from `SubjectArt.jsx` without third-party image calls. Six additional Simple Icons 11.15.0 marks (MDN, React, Python, PostgreSQL, Kubernetes and freeCodeCamp) are downloaded locally by the existing validated brand importer. Their exact sources and retrieval dates are recorded in `shared/content/brands.json`; trademarks remain their owners’ property.

## Typography and motion

The redesigned workspace uses locally served Latin variable fonts: DM Sans and Manrope, distributed under the SIL Open Font License. Exact Google Fonts download URLs, license sources, sizes and retrieval dates are recorded in `shared/content/typography.json`; the license texts ship beside the WOFF2 files in `public/fonts/`. Refresh using `node scripts/import-typography.mjs`. The importer validates the font signature and size. No external font request is needed at runtime.

The dimensional orbit scene, sphere, rings, satellites, grain, project graphic and chart treatments are original StudentOS CSS/SVG compositions. `DesignEffects.jsx` provides viewport-triggered counters, scroll reveals and restrained pointer tilt. They use native browser APIs and existing React; no animation dependency or third-party image service was added. Reduced-motion preferences disable the decorative movement.

## Course photography and product icons · 22 October 2026

Three photographs are stored at 640- and 1,200-pixel widths as WebP files in `public/learning/`: [Florian Olivo’s code](https://unsplash.com/photos/lines-of-html-codes-4hbJ-eymZ1o), [Taylor Vick’s server infrastructure](https://unsplash.com/photos/cable-network-M5tzZtFCOfs), and [Luke Chesser’s analytics](https://unsplash.com/photos/graphs-of-performance-analytics-on-a-laptop-screen-JKUTrJ4vK00). All three source pages identify the images as free under the [Unsplash License](https://unsplash.com/license). `shared/content/learning-images.json` records the source, photographer, retrieval date, dimensions, size and SHA-256 digest. Refresh with `node scripts/import-learning-images.mjs`. Images are decorative course covers; they do not imply that these photographers produced or endorse a course. No external image request is required during ordinary browsing.

Product navigation and key feature icons use 25 duotone symbols from [Phosphor Icons](https://github.com/phosphor-icons/react), under the MIT License retained in `public/icons/LICENSE.txt`. Refresh the local sprite with `node scripts/build-product-icons.mjs`. Only the SVG paths are served to browsers; the React icon generator remains a development dependency. Small utility controls retain the existing Lucide set. The StudentOS favicon and logo mark remain original vector artwork.
