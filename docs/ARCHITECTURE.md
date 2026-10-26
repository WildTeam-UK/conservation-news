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
                         Buffer social/Brevo email distribution
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
- Vercel Speed Insights for production Core Web Vitals
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
| `.github/workflows/` | Repository automation, including encrypted database backups |
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
- Contextual-link health, diagnostics and controlled reassessment
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

Public read policies expose active taxonomy and published editorial records. Admin policies call the authenticated-only, security-invoker `is_content_admin()` function, which checks the caller's own RLS-visible admin record. The internal `rls_auto_enable()` event-trigger function is not executable through the Data API. The service role performs scheduled and privileged processing.

### Principal data groups

- Identity: `admin_users`
- Taxonomy: `topics`, `content_tags`, aliases and story/cluster joins
- Sources: `sources`, `source_topics`, `source_items`, ingestion runs and per-source ingestion tasks
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

1. A collection run snapshots the enabled RSS sources into durable per-source tasks.
2. Each request leases up to 10 source tasks and checks up to five feeds concurrently, retaining the existing 20-second per-feed timeout.
3. Interrupted task leases expire and become claimable again; a failed source does not repeat successful checks.
4. Previously unseen items are inserted into `source_items`.
5. Recent unprocessed items are claimed in assessment batches.
6. OpenAI assesses relevance, quality, evidence, timeliness and related signals.
7. Qualifying items become or join story clusters; rejected items remain assessed and are not repeatedly charged.
8. Every qualifying cluster remains a candidate until it is drafted, rejected or becomes stale; candidate creation is not capped by the daily draft limit.
9. Active undrafted candidates receive a time-sensitive effective score. The default removes two points per complete day since the latest supporting source and adds a deliberately small three-point bonus when Wildlife is the primary topic. Geography is not a ranking factor.
10. The daily run researches and drafts only the highest-ranked active candidates needed to fill that day's remaining article target. Candidates older than the configurable seven-day freshness window remain stored for audit but are excluded from automation and the active Candidates workspace.

Manual collection, periodic collection and the daily editorial run use the same resumable collection mechanism. The admin request reports completed progress immediately; the minute heartbeat continues any remaining source tasks. Once per day, an otherwise idle heartbeat clears old replaceable `raw_content` in a bounded batch after the configured 30-day retention period. It preserves item metadata, URLs, hashes and assessment history, and excludes payloads supporting stories, research packs or pending coverage updates. Retention runs are logged. Source-item row deletion remains deferred until production history supports a safe policy.

Candidate freshness days, daily score decay and the wildlife bonus are stored in `editorial_run_settings` and can be adjusted with the existing daily workflow controls. Effective scores are calculated from the original assessment score at read or selection time, so the underlying AI assessment remains intact and the ranking naturally changes as candidates age.

### Research and drafting

1. A selected candidate receives a research pack using its source coverage and web research.
2. Source suggestions discovered during research are accumulated for later feed review.
3. OpenAI generates a structured article conforming to the shared article template and house style.
4. Taxonomy, conservation outlook and the featured course recommendation are attached.
5. A separate OpenAI link-editor pass examines the final copy against approved related articles, active topics, approved tags, courses and verified sources. Deterministic validation then enforces exact complete-word anchors, confidence thresholds, destination limits and duplicate prevention before accepted links are stored.
6. Proposed, accepted and rejected counts, rejection categories, token usage, cost and retryable failures are recorded in `story_linking_assessments`.
7. The result remains private after generation. It can then enter the publication queue or be published manually.

### Publication

Eligible drafts from the current editorial run enter `publication_queue`. The daily article target is the single limit for drafting and publishing. The queue distributes those articles only across the remaining portion of that same day's configured London publishing window; it does not create a future-day backlog. A database claim function permits only one due publication per heartbeat and recovers interrupted publications after five minutes. Drafts held by automatic source or score thresholds can be reviewed and explicitly approved by an authenticated editor; the queue records that approval and still reruns the content publication checklist before the scheduled article goes live.

The database keeps an article's `stories.status` as `draft` until it becomes public. Admin workflow labels combine that private/public state with `publication_queue.status`: **Drafts** are private articles outside the active queue, **Scheduled** covers queued, scheduled and currently publishing articles, **Held** identifies private articles requiring attention, and **Published** identifies live articles. These admin groups are mutually exclusive even though scheduled and held records remain database drafts.

Published content is read dynamically for the homepage, archives, related stories, sitemap, structured data and `llms.txt`.

### Digests

At the configured digest time, published stories from the relevant period are selected. Monday–Thursday and weekend runs create daily digests; Friday creates a weekly digest instead. Digest generation supplies one primary and two progressively broader visual search terms for the edition's overarching theme. The server searches Unsplash independently, rejects images already attached to the digest's source articles or recent digests, records the selected image and attribution, and triggers Unsplash download tracking. It does not repurpose a source article's featured image for the digest. Once the connected editorial copy is final, the same dedicated link-editor and deterministic validation process assesses approved source stories, related articles, active topics, approved tags, courses and underlying reporting. Accepted digest links remain in the structured digest content while their assessment diagnostics are stored in `story_linking_assessments`. Digests publish immediately when that setting is enabled. Once an edition is public, a leased social-editorial delivery uses the final digest, published source-story evidence and recent social posts to generate, independently review and validate the social edition before creating independently tracked Buffer channel deliveries. Friday's weekly edition can also create and send a Brevo campaign to the existing Weekly Digest list. Daily editions are not emailed because the public subscription promise is weekly. Distribution is disabled by default and can be enabled independently for Buffer and Brevo in the admin workspace.

## Scheduling and recovery

Supabase `pg_cron` calls the Vercel automation endpoint once per minute through `pg_net`. The request uses a bearer secret stored in Supabase Vault.

The heartbeat:

- Publishes one due queued story.
- Claims or advances the daily editorial run.
- Claims or recovers a due digest run.
- Claims one due external digest delivery, with each Buffer channel and Brevo campaign tracked independently.
- Continues any active resumable source collection, or starts periodic collection when no editorial run is active.
- Runs one bounded raw-payload retention batch daily when higher-priority work is idle.

Database row locking and short leases prevent overlapping requests from duplicating work. Source checks and editorial steps can recover after interruption; digest runs can recover after fifteen minutes. A distribution request whose lease expires without a recorded provider response is marked uncertain and requires an explicit editor retry, because replaying it automatically could duplicate a post or campaign. The editorial workflow runs at 07:00 UK time by default, one hour before the current 08:00 publication window, and enforces the shared daily article target and estimated-cost limit.

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
- Daily and weekly digest generation, including purpose-written social copy

All generated editorial prompts should include `AI_HOUSE_STYLE`. Estimated usage is stored with run and generation records.

### Unsplash

Used server-side to search for landscape editorial images. The application hotlinks transformed Unsplash URLs, stores creator/licence attribution, and calls the download endpoint when a selection is used. Articles and digests perform separate searches: a digest selects a new image for its overall editorial theme and excludes images attached to its source stories and recent digests. Digest heroes use the shared charcoal surface rather than image-derived colours.

### Brevo

`/api/newsletter/subscribe` validates an email address and adds or updates the contact in the configured Brevo list. A honeypot field provides basic bot filtering. When email distribution is enabled, a published Friday digest is rendered as a responsive Brevo marketing campaign with custom browser-view and unsubscribe links, created against the same list and submitted for sending. The subject uses `WildNews Weekly | [edition headline]`. The email uses a purpose-written, shortened editorial edition generated in the existing digest AI pass, the digest hero image, a second source-story image within the editorial copy, five recent source-story cards, a full-width WildTeam Training promotion and a link to the full web edition rather than reproducing the complete digest. Older editions without dedicated email copy fall back to their standfirst and shortened extracts from their first three sections. The provider campaign ID and delivery outcome are stored against the digest run. An authenticated editor can also send the exact rendered weekly email to one explicit test address from the digest preview. The application creates a recipient-free draft campaign, uses Brevo's test-send endpoint, deletes the draft and records an audit event without storing the test address or changing distribution status.

### Buffer

When social distribution is enabled, publication creates one durable `social-editorial` delivery rather than calling OpenAI or Buffer inside the already busy publication request. A later heartbeat supplies the final published digest, compact evidence from its published source stories and up to eight recent generated posts to a dedicated social editor. Daily editions select three or four developments and target roughly 120–180 words; weekly editions select four or five developments and target roughly 180–250 words with more synthesis and reflection. A separate AI editorial review checks grounding, qualifications, selection, readability, repetition and the relevance and tone of its restrained emoji use, and records claim-to-story support. Deterministic validation independently enforces source IDs, flexible safety length bounds, paragraph structure, one relevant opening emoji and no more than two optional body emojis, a non-generic and sufficiently distinct opening, two or three hashtags including `#WildNews`, absence of inappropriate reaction emojis, relative dates, unsupported Markdown, embedded URLs and em dashes, and one exact application-owned canonical digest link directly beneath the opening paragraph. Invalid or rejected copy never creates a channel delivery.

Validated text, selected story IDs, review diagnostics, prompt versions, token usage and estimated cost are retained in `digest_runs.social_copy`; each Buffer delivery also keeps the immutable exact payload it will submit. A retry of an interrupted social-editorial stage reuses already validated stored copy, so it cannot silently create different channel payloads. Each configured Buffer channel then receives the same image post through its own leased delivery record. Before submission, the server resolves the destination's Buffer service and adds required network-specific metadata, including the `post` content type for Facebook, while retaining the shared copy and image payload for LinkedIn. Editors choose between Buffer's `addToQueue` mode, which retains each channel's posting schedule, and `shareNow`, which publishes as soon as the delivery heartbeat processes the post. Each destination has its own attempt count and provider post ID, preserving the existing duplicate-prevention and uncertain-outcome safeguards. Buffer credentials remain server-only.

### Analytics

The public application uses the existing WildTeam Google Tag Manager container, `GTM-KW2PQNF`, which feeds the shared Google Analytics 4 property used by the main WildTeam and Training sites. On `news.wildteam.org.uk`, statistical analytics are enabled by default under the UK statistical-purposes exception. Consent Mode v2 keeps `ad_storage`, `ad_user_data` and `ad_personalization` denied for WildNews. Visitors receive a clear notice and may opt out free of charge; opting out disables the container on subsequent loads and removes existing Google Analytics cookies. Preview deployments, local development and authenticated admin routes are not tracked. The visitor's choice is stored locally in the browser and can be changed from the site footer.

### Performance monitoring

Vercel Speed Insights records Core Web Vitals for public production pages only. Admin routes and preview deployments are excluded. Dynamic story, digest, topic and tag paths are grouped by route pattern so performance can be compared across each page type without exposing editorial slugs as separate route groups.

### Availability and automation health

`/api/health` is the production monitoring endpoint. It returns no records or error details, but verifies that Supabase is reachable, the one-minute automation heartbeat is current, and enabled editorial, publishing, digest and distribution systems have not recorded an unresolved automation failure. A failed or uncertain delivery makes enabled distribution unhealthy until an editor resolves or retries it. A required heartbeat older than ten minutes makes the endpoint return HTTP 503; a healthy or intentionally disabled system returns HTTP 200. The endpoint is uncached and excluded from search indexing so an external uptime service can use its HTTP status for alerts without receiving private operational data.

### Backup and recovery

While the Supabase project remains on the Free plan, `.github/workflows/supabase-backup.yml` creates an encrypted logical database backup every day at 03:30 UTC and supports manual runs. The workflow uses the official Supabase CLI, verifies the encrypted archive before upload, and retains the encrypted GitHub Actions artifact for 30 days. Production records are never committed to the repository.

The workflow depends on the GitHub Actions secrets `SUPABASE_DB_URL`, `SUPABASE_DB_PASSWORD` and `BACKUP_ENCRYPTION_PASSPHRASE`. The database address and password remain separate so passwords containing URL-sensitive characters do not make the connection URI invalid, and the assembled backup connection explicitly requires SSL. They are repository automation secrets, not application runtime variables, and do not belong in `.env.example` or Vercel. The operational scope, exclusions, integrity check and safe recovery sequence are documented in `docs/BACKUP_RECOVERY.md`.

Logical database backups do not contain Supabase Storage object bytes, a separate Supabase migration-history schema or external-platform configuration. The ordered files in `supabase/migrations` remain the migration source of truth. Storage currently contains admin avatars; service credentials and configuration remain the responsibility of their owning platforms and secure organisational password storage. If Supabase is upgraded to a paid production plan, Supabase-managed daily backups should become the primary recovery mechanism and this workflow should be reassessed rather than silently duplicated.

`/api/health/supabase` remains a narrower database-connectivity diagnostic. Vercel provides deployment-failure notifications and runtime logs on the current plan. Automated Vercel runtime-anomaly alerts require a paid Observability tier, so external monitoring of `/api/health` supplies the proactive availability alert.

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
| `BREVO_SENDER_ID` | Server configuration | Verified Brevo sender used for Weekly Digest campaigns |
| `BUFFER_API_KEY` | Server only | Buffer GraphQL API authentication |
| `BUFFER_CHANNEL_IDS` | Server configuration | Comma-separated Buffer channels that receive published digests |
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

