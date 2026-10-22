# WildNews architecture

This document records the application architecture currently implemented in the repository. It must be updated when a service boundary, deployment process, environment variable, database object or core data flow changes.

## System overview

WildNews is a server-rendered React application that collects conservation coverage, groups and assesses source items, researches qualifying stories, generates source-linked editorial briefings, schedules publication, and produces daily or weekly digests.

```text
RSS sources
    |
    v
Supabase source_items -> AI assessment and clustering -> ranked candidates
                                                        |
                                                        v
                                              research packs + sources
                                                        |
                                                        v
                                              generated private drafts
                                                        |
                                                        v
                                          publication queue -> public stories
                                                        |
                                  +---------------------+--------------------+
                                  |                                          |
                                  v                                          v
                         daily/weekly digests                       public archives/SEO
                                  |
                         future social/email distribution
```

The public application reads published records with the Supabase publishable key. Authenticated admin pages use Supabase Auth and verify membership in `admin_users`. Privileged ingestion, automation and AI operations use a server-only Supabase service-role client.

## Repository and delivery

- Repository: `https://github.com/WildTeam-UK/conservation-news.git`
- Primary branch: `main`
- Feature work is performed on separate branches, previewed by Vercel, reviewed, then merged into `main`.
- Vercel production project: `conservation-news`
- Intended canonical domain: `https://news.wildteam.org.uk`
- Current framework declaration: Nitro in `vercel.json`
- Build command: `vite build`
- Application build script: `vite build`
- Production start command: `node .output/server/index.mjs`
- Supported Node.js runtime: 22.13 or newer
- Pinned package manager: pnpm 11.25.0

Preview deployments are marked `noindex`. Production metadata permits indexing of public pages while `robots.txt` excludes `/admin/` and `/api/`.

Vercel applies browser-security headers to every route: MIME sniffing is disabled, framing is denied, cross-origin referrers are limited to their origin, and unused camera, geolocation, microphone, payment and USB capabilities are disabled. The Content Security Policy restricts pages to same-origin code and fonts, permits the inline hydration and style output required by the current Vinext/React implementation, permits browser connections only to WildNews and Supabase, and permits HTTPS editorial images because administrators may supply attributed images outside Unsplash or Supabase Storage.

## Framework and principal dependencies

### Runtime

- React 19
- Vinext 1, providing the Next-compatible App Router runtime on Vite
- Vite 8
- Nitro 3, producing the Vercel server output
- TypeScript
- Supabase JS and Supabase SSR
- OpenAI JavaScript client
- `fast-xml-parser` for RSS ingestion
- Lucide React for interface icons

### Styling

- Global CSS in `app/globals.css`
- Admin workspace CSS in `app/admin-workspace.css`
- WildNews-owned global CSS with no utility-framework or component-library runtime
- Local VAG Rounded font files under `public/fonts`

The unused generic starter component collection and its component-only dependencies were removed during pre-launch cleanup. Public and admin interfaces use WildNews-owned components in `components/`.

## Repository structure

| Path | Responsibility |
| --- | --- |
| `app/` | App Router pages, layouts, metadata routes and HTTP endpoints |
| `app/admin/` | Authenticated editorial workspace |
| `app/api/admin/` | Authenticated/manual editorial operations |
| `app/api/automation/` | Secret-authenticated scheduled heartbeat |
| `components/` | Public and admin React components |
| `lib/` | Editorial, ingestion, AI, publishing, taxonomy, SEO and service logic |
| `lib/supabase/` | Browser, SSR and service-role Supabase clients |
| `lib/openai/` | Assessment, research, drafting and digest generation |
| `lib/images/` | Unsplash integration, attribution and colour handling |
| `supabase/migrations/` | Ordered production database migrations |
| `public/` | Fonts, favicon, logo and social-sharing image |
| `docs/` | Architecture, design and database documentation |
| `vite.config.ts` | Vinext, Nitro and local development-server configuration |

## Public routes

Core public routes are:

- `/`: latest stories plus independently queried topic shelves containing up to 12 recent published stories per editorial topic
- `/stories/[slug]`: standard news briefing
- `/daily-digest/[date]`: daily editorial digest
- `/weekly-digest/[date]`: Friday weekly digest
- `/digests`: combined digest archive
- `/topics/[topic]`: controlled topic archive
- `/tags/[tag]`: approved discovery-tag archive
- `/good-news-in-conservation`: positive-outlook archive
- `/how-we-use-ai`
- `/how-coverage-analysis-works`
- `/how-we-classify-good-news`
- `/about`

Machine-readable routes include `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` and `/llms.txt`.

## Admin routes

The admin workspace covers:

- Overview and system activity
- Collection pipeline, collected items and ranked candidates
- Articles and draft editing
- Publication schedule
- Daily and weekly digests
- Monitored sources and source recommendations
- Topics, tags and Good News classification
- Training courses and course recommendations
- User settings

`app/admin/layout.tsx` marks the entire admin area `noindex`, `nofollow`, `noarchive` and `nocache`.

## Supabase integration

### Clients and trust boundaries

- `lib/supabase/browser.ts`: browser-safe client using the public URL and publishable key.
- `lib/supabase/server.ts`: cookie-aware SSR client used for authentication and user-scoped operations.
- `lib/supabase/admin.ts`: cached service-role client for server-only privileged work.
- `lib/supabase/require-admin.ts`: verifies the authenticated Supabase user has an active `admin_users` record.

Public read policies expose active taxonomy and published editorial records. Admin policies call `is_content_admin()`. The service role performs scheduled and privileged processing.

### Principal data groups

- Identity: `admin_users`
- Taxonomy: `topics`, `content_tags`, aliases and story/cluster joins
- Sources: `sources`, `source_topics`, `source_items`, ingestion runs
- Editorial grouping: `story_clusters`, cluster items and cluster updates
- Published content: `stories`, topics, organisations, sources and contextual links
- AI evidence: `ai_generations`, `research_packs`, linking assessments
- Daily workflow: editorial settings, runs, run items and run events
- Publishing: `publication_queue`
- Digests: digest settings, runs, selected stories and events
- Source discovery: source suggestions and mentions
- Training: training courses and story recommendations
- Good News: settings and conservation-outlook records

Database changes are append-only migrations. Existing production migrations must not be rewritten.

## Editorial data flow

### Collection and assessment

1. Enabled RSS feeds are fetched and parsed.
2. Previously unseen items are inserted into `source_items`.
3. Recent unprocessed items are claimed in batches.
4. OpenAI assesses relevance, quality, evidence, timeliness and related signals.
5. Qualifying items become or join story clusters; rejected items remain assessed and are not repeatedly charged.
6. Recent undrafted candidates are ranked for the daily run.

### Research and drafting

1. A selected candidate receives a research pack using its source coverage and web research.
2. Source suggestions discovered during research are accumulated for later feed review.
3. OpenAI generates a structured article conforming to the shared article template and house style.
4. Taxonomy, conservation outlook, course recommendation and contextual-link records are attached.
5. The result remains a private draft until queued or manually published.

### Publication

Eligible drafts enter `publication_queue`. The queue distributes them across the configured London publishing window. A database claim function permits only one due publication per heartbeat and recovers interrupted publications after five minutes.

Published content is read dynamically for the homepage, archives, related stories, sitemap, structured data and `llms.txt`.

### Digests

At the configured digest time, published stories from the relevant period are selected. Monday–Thursday and weekend runs create daily digests; Friday creates a weekly digest instead. Digest generation receives bounded candidates for related articles, active topics, approved tags, active courses and underlying reporting, then stores a validated contextual-link plan with the structured digest content. Digests publish immediately when that setting is enabled. Social and email distribution states exist in the schema but external distribution is currently disabled.

## Scheduling and recovery

Supabase `pg_cron` calls the Vercel automation endpoint once per minute through `pg_net`. The request uses a bearer secret stored in Supabase Vault.

The heartbeat:

- Publishes one due queued story.
- Claims or advances the daily editorial run.
- Claims or recovers a due digest run.
- Performs periodic source collection when no editorial run is active.

Database row locking and short leases prevent overlapping requests from duplicating work. Editorial steps can recover after interruption; digest runs can recover after fifteen minutes. The editorial workflow enforces draft-count and estimated-cost limits.

The scheduled migration currently targets `https://conservation-news.vercel.app/api/automation/editorial`. Changing the production hostname requires reviewing this endpoint and the Vault configuration.

## External APIs

### OpenAI

Used server-side for:

- Source-item assessment and clustering
- Story research and web-search-supported research packs
- Structured article drafting
- Structured article and digest contextual-link planning
- Coverage analysis and conservation outlook
- Taxonomy suggestions and descriptions
- Course recommendations and contextual-link assessment
- Daily and weekly digest generation

All generated editorial prompts should include `AI_HOUSE_STYLE`. Estimated usage is stored with run and generation records.

### Unsplash

Used server-side to search for landscape editorial images. The application hotlinks transformed Unsplash URLs, stores creator/licence attribution, and calls the download endpoint when a selection is used. Digest hero colour may use the stored or fetched Unsplash colour, with WildTeam purple as fallback.

### Brevo

`/api/newsletter/subscribe` validates an email address and adds or updates the contact in the configured Brevo list. A honeypot field provides basic bot filtering. Weekly campaign generation and sending are not yet implemented.

### Buffer

Buffer distribution is planned but not implemented. There is no active Buffer client or environment variable in the repository. Digest social status remains disabled.

## Environment variables

Only names and purposes belong in source control.

| Name | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Supabase publishable/anon access |
| `SUPABASE_URL` | Server only | Supabase URL used by the service-role client |
| `SUPABASE_SECRET_KEY` | Server only | Supabase service-role secret |
| `OPENAI_API_KEY` | Server only | OpenAI assessment, research and generation |
| `UNSPLASH_ACCESS_KEY` | Server only | Unsplash public image API |
| `BREVO_API_KEY` | Server only | Brevo contact API |
| `BREVO_LIST_ID` | Server configuration | Weekly Digest contact-list identifier |
| `AUTOMATION_SECRET` | Server only | Bearer secret for the scheduled automation endpoint |
| `VERCEL_ENV` | Platform supplied | Distinguishes production from preview for indexing |
| `NODE_ENV` | Platform supplied | Runtime mode fallback |
| `CODEX_SANDBOX` | Local tooling | Enables polling for local sandbox HMR |

`.env.example` contains the user-configured variables required by the application. Platform-provided and local-tooling variables are documented here but do not require manual values in the example file.

## Assets and metadata

- Fonts: `public/fonts/`
- WildTeam favicon and Good News mask: `public/favicon.png`
- WildTeam logo used in schema: `public/wildteam-logo.png`
- Default social image: `public/og.png`
- Dynamic editorial images: remote Unsplash URLs with stored attribution

`app/layout.tsx` defines default metadata. `lib/seo.ts` centralises canonical URLs, Open Graph/Twitter values and Schema.org objects. Story and digest routes emit `NewsArticle`; the root emits `WebSite` and `Organization`.

`app/sitemap.ts` derives public URLs from current published content and taxonomy. `app/llms.txt/route.ts` derives its latest stories, digests, topics and approved tags from the same data.

The default social image is a 1200×630 WildNews-branded graphic. Public metadata uses the intended canonical domain and falls back to this image when a story-specific image is unavailable.

## Legacy Sites remnants

The repository began from a ChatGPT Sites-oriented starter. Its Sites hosting manifest, Vite plugin, plugin configuration, package name, SVG favicon and unused Cloudflare-oriented package allowances were removed during pre-launch cleanup. The application does not use Sites authentication, connectors, D1, R2 or deployment.

Vinext, Vite and Nitro remain active framework dependencies and produce the Vercel deployment.

## Verification

Normal code verification:

```text
pnpm exec tsc --noEmit
pnpm exec oxlint <changed files>
git diff --check
pnpm build
```

Deployment verification must additionally cover Supabase connectivity, admin authentication, the automation heartbeat, collection, draft creation, queue publication, digest generation, newsletter signup, public metadata, structured data, sitemap, robots and `llms.txt`.

