# WildNews design system

This document records the design currently implemented by WildNews. It is descriptive, not a redesign brief. When the code and this document disagree, inspect the live component and effective CSS cascade before changing either.

## Foundations

### Colour tokens

The public application defines its core tokens in `app/globals.css`.

| Token | Value | Implemented use |
| --- | --- | --- |
| `--ink` | `#080808` | Primary text, strong rules and dark surfaces |
| `--brand-purple` | `#6e0f6c` | WildTeam purple, headings, links and primary hover states |
| `--brand-gradient-middle` | `#b41e8e` | Middle stop in branded gradient treatments |
| `--brand-pink` | `#e60088` | WildTeam pink, primary actions, accents and focus states |
| `--cream` | `#fef3e5` | Warm neutral panels, topic pills and supporting surfaces |
| `--paper` | `#ffffff` | Page and card surfaces |
| `--rule` | `#d6d1d3` | Standard dividers and quiet borders |
| `--muted` | `#5d5d61` | Secondary copy, dates and metadata |
| `--footer-surface` | `#2a2f34` | Shared WildTeam footer background |
| `--footer-muted` | `#f5f5f5` | Secondary footer links and legal copy |
| `--text-on-purple-muted` / `--text-on-ink-muted` | `#eadbea` / `#d9d5d7` | Supporting copy on the two dark CTA surfaces |
| `--text-placeholder` | `#777378` | Form placeholder copy |
| `--accent-coral` | `#e84a43` | Contested coverage signal |
| `--accent-orange` | `#ff8044` | Economic coverage signal, warning progress and retained accent treatments |
| `--signal-neutral-track` / `--signal-neutral-fill` | `#ddd` / `#8f8f8f` | Neutral coverage-analysis tracks and values |
| `--status-success-text` / `--status-success-surface` | `#17602d` / `#e7f5e9` | Successful admin states and confirmation messages |
| `--status-warning-text` | `#9a4917` | Warning icons and copy |
| `--status-error-text` / `--status-error-surface` | `#8a1d24` / `#fff0f0` | Standard destructive and failed states |
| `--status-error-strong` | `#7b1820` | Higher-emphasis error copy |
| `--status-info-text` / `--status-info-surface` | `#18517c` / `#e8f4ff` | Informational, generated and scheduled states |
| `--status-pending-text` / `--status-pending-surface` | `#875109` / `#fff1d9` | Work that is actively publishing or awaiting completion |
| `--status-partial-text` / `--status-partial-surface` | `#785514` / `#fff4d7` | Partial workflow outcomes |

Less frequently repeated state shades remain local to the component that owns them. Course promotions use a course-specific `--course-colour` supplied by the database.

The Good News and digest “fancy” labels use a gradient made from `#6e0f6c`, `#b41e8e` and `#e60088`. Their hover state is solid pink with white text.

### Typography

The application uses **VAG Rounded** throughout. Local files live under `public/fonts`:

- Light: `vag-rounded-light.woff2`, weights 300–500
- Bold: `vag-rounded-bold.woff`, weights 501–800
- Black: `vag-rounded-black.woff`, weights 801–950

`--font-family` is the single application font-family token. All public, editorial and admin interfaces use it with a sans-serif fallback; there is no secondary UI family or active serif typeface.

The three installed faces are exposed through semantic weight tokens rather than treating every numeric value as a different design choice:

| Token | Value | Role |
| --- | --- | --- |
| `--font-weight-regular` | `400` | Body copy and normal controls |
| `--font-weight-bold` | `800` | Eyebrows, captions and supporting emphasis |
| `--font-weight-black` | `900` | Display headings, card titles, actions and strong labels |

The shared public typography roles are:

| Role | Tokens | Current treatment |
| --- | --- | --- |
| Caption | `--type-caption-size`, `--type-caption-leading` | 10px / 1.35; used by editorial image credits |
| Label | `--type-label-size`, `--type-label-leading`, `--type-label-tracking` | 11px / 1 / `.1em`; used by the standard eyebrow |
| Small body | `--type-body-small-size`, `--type-body-small-leading` | 15px / 1.55; used by supporting CTA copy |
| Editorial body | `--type-body-size`, `--type-body-leading` | 17px / 1.65; sections may retain a deliberately roomier local leading |
| Editorial lead | `--type-lead-size`, `--type-lead-leading` | 21px / 1.72; used by digest introductions |
| Card title | `--type-card-title-size`, `--type-card-title-leading` | 25px / 1.08; used by related and digest discovery cards |
| Section title | `--type-section-title-size`, `--type-section-title-leading` | 44px / 1; used by principal editorial sections |

Components own their layout, colour and responsive variation while consuming these shared roles. A one-off display size may remain local when it expresses a genuinely different hierarchy; new near-duplicate values should not be introduced without updating this system.

Implemented hierarchy:

- Public body default: 18px.
- Editorial body copy: normally 16–18px with 1.5–1.78 line height.
- Article and digest introductions: about 18px on small screens and 21px on larger screens.
- Labels, dates, eyebrows and metadata: usually 8–12px, bold or black, uppercase, with positive letter spacing.
- Card titles: commonly 21–25px.
- Section headings: commonly 36–44px, depending on context and viewport.
- Feature and archive titles: responsive `clamp()` sizes, normally around 48–96px.
- Article hero titles: up to approximately 104px on wide screens and 48px on phones.
- Display headings use tight line height and negative letter spacing. Body copy uses normal tracking.

The `WILDNEWS` wordmark uses weight 950, tight tracking and separate purple `WILD` and pink `NEWS` spans. Inline branding follows this treatment except inside the digest hero, newsletter CTAs and training banner, where it inherits the surrounding typography and colour.

### Layout and spacing

- Standard public shell: `min(1240px, 100% - 48px)` and horizontally centred.
- Phone shell gutter: 15px on each side (`100% - 30px`).
- The primary editorial reading column is approximately 760px.
- Digest editorial images may expand to approximately 920px while remaining centred on the reading column.
- Public sections generally use generous vertical spacing, commonly 52–110px.
- Component gaps commonly use 7–12px for compact controls, 20–32px for cards, and 50–90px for major grids.

The main public grids are:

- Homepage hero: asymmetric two-column layout with the lead image on the left and story copy on the right. At the shared mobile breakpoint, the image remains first and the story copy stacks underneath it.
- Latest stories: primary list plus compact secondary column.
- Standard listings: two-column card grid on desktop.
- Topic shelves: horizontal snap-scrolling card tracks.
- Article body: main editorial column plus sticky analysis/training sidebar.
- Digest hero: 50/50 copy and image.
- Archive lead: one featured story followed by standard story cards.
- Related or “more” stories: three-column discovery grid.

### Responsive tiers

The stylesheet contains feature-specific breakpoints. The principal behavioural tiers are:

- Above 920px: full desktop admin navigation.
- 821px and above: desktop public navigation and multi-column public layouts.
- 900–1120px: tablet adjustments for selected admin, digest and card layouts.
- 820px and below: public navigation becomes a hamburger menu; major grids stack.
- 600px and below: digest-specific phone treatment.
- 560px and below: compact public typography, 15px gutters and phone card layouts.
- 520px and below: selected admin controls stack fully.

Do not introduce another breakpoint without confirming that an existing tier cannot express the required behaviour.

## Shape, borders and depth

- Compact controls use `--radius-control` at 9px and compact surfaces use `--radius-compact` at 10px.
- Standard cards use `--radius-card` at 18px; large panels use `--radius-panel` at 22px.
- Pill and circular shapes use `--radius-pill` and `--radius-round`.
- Public button radius: 6px.
- Image and standard card radii are 18px where the shared card token is used.
- Some feature-specific editorial panels retain 20px or 24px radii.
- Some feature-specific admin inputs and small controls retain 7px, 8px, 11px, 12px or 14px radii.
- Pills and circular controls: 999px or 50%.
- Standard dividers: 1px `--rule`.
- Strong section dividers: 3px `--ink`.
- Public components are generally flat. Repeated black offset shadows use the `--shadow-offset-sm` through `--shadow-offset-xl` scale; muted legacy cards use `--shadow-card-soft`.
- Admin cards use a quiet grey border and a scoped `3px 3px` neutral shadow.
- Image attributions use a white 99px-radius capsule, 10px muted text and a subtle shadow.

The admin surface standardises card borders and shadows through `--admin-card-border` and `--admin-card-shadow` in `app/admin-workspace.css`.

## Interaction states

- Primary public buttons: pink background, white text; purple background on hover.
- Secondary public buttons: transparent with pink border/text; purple border/text on hover.
- Shared CTA colour states are owned by the `Public CTA colour system` block in `app/globals.css`; component rules define their geometry and layout without restating those colours.
- The Good News navigation button uses the primary treatment plus a periodic shine. Reduced-motion users do not receive the animation.
- Topic pills: cream with purple text; pink with white text on hover.
- Fancy digest and Good News pills: white centre, 1px gradient border and gradient text; pink with white text on hover.
- Editorial text links: purple, frequently with a pink underline or arrow.
- Images in prominent story links use a subtle scale-up hover.
- Source-number circles use a grey border/text and change to pink on hover or focus.
- Links, buttons, form controls and disclosure summaries use a 2px pink keyboard-focus outline with a 3px offset. Components on dark surfaces may override this with a white ring, and newsletter inputs expose focus on their shared outer control.
- Animation must respect `prefers-reduced-motion`.

## Shared public components

### Navigation

`SiteNavigation` is sticky through its containing header. Desktop height is approximately 94px. It contains the WILDNEWS wordmark, primary links, an outlined “How we use AI” action and the highlighted Good News action. At 820px and below it becomes a full-width dropdown controlled by a hamburger button.

`InteriorHeader` reuses the same public navigation on interior pages.

### Editorial heroes

`ArchiveHero` and `PageHero` share the `editorial-hero` foundation. Both use the same shell width, vertical spacing, divider, title scale and full-width description. Archive heroes begin with a taxonomy or editorial pill and may include archive metadata; general-page heroes begin with an eyebrow. An archive description's optional trailing link uses the shared `descriptionLink` slot: it remains inline on larger screens and starts on a clean new line without leading or trailing whitespace on phones. New public informational pages should use `PageHero` rather than defining page-specific hero spacing or typography.

The closing editorial action panel used by the AI-transparency and Good News methodology pages is a borderless cream section.

The About page introduces related methodology pages through a three-column editorial guide grid. Each entry uses the established eyebrow, heading, body-copy and `text-link` patterns; it does not introduce a separate card treatment.

### Error pages

The public 404 page uses the WildTeam sloth illustration and friendly Training-site recovery copy in a centred layout. It retains the WildNews navigation, footer, typography and primary `.action-button` treatment. Runtime errors continue to use the more functional retry and homepage actions.

### Buttons

Use existing button classes or component-owned styles:

- Primary: `.read-more-button`, `.action-button` and CTA buttons.
- Secondary outline: `.site-navigation-button.secondary`.
- Compact admin actions remain component-specific but share grey borders, 8–10px radii and uppercase labels.

### Topic, tag and status labels

- `TopicTag` is the standard taxonomy link and may render as a topic pill.
- Approved discovery tags appear as small outlined pills.
- `DigestTag` represents daily or weekly editions and always links to `/digests`.
- `GoodNewsBadge` links to `/good-news-in-conservation`; image overlays collapse to a borderless icon treatment.
- Public topic, digest and expanded Good News pills use the shared `editorial-pill` structure and a consistent font weight of 900. Main topic and expanded Good News pills use 12px labels with `.05em` letter spacing. Every full pill reserves the same 1px border slot: standard topic pills keep it transparent, while fancy digest and Good News pills use it for the gradient border. Full pills use 7px by 12px internal padding and compact discovery pills use 5px by 9px, preserving their established outer dimensions. The pill itself owns flex alignment; its direct icon and label children must not stretch or establish another flex layout. The label trims the font's invisible cap-height and baseline space with `text-box`, allowing the parent to centre the visible label against the icon without positional offsets.
- Admin statuses use compact filled pills with semantic success, warning and error colours.

### Story cards

Story discovery uses a small set of repeated patterns:

- `story-card`: image and copy rows used in the main latest-stories list. Their summaries remain visible on phones and are clamped to two lines; the compact right-column stories remain title-led.
- `compact-story`: smaller image/title rows.
- `carousel-card`: horizontal topic-shelf cards.
- `TopicStoryShelf`: reusable homepage topic carousel containing up to 12 recent matching stories.
- `topic-story`: archive cards, with the first item promoted to `topic-story-featured`. The copy column uses a consistent 16px title-to-description gap. Its explicit read link is aligned to the bottom of the card, with 16px of minimum separation from the preceding content at every breakpoint.
- `related` / `SimilarStories`: three-card discovery section.
- `digest-more`: six most recent daily digest cards on daily digest pages.

Cards display the appropriate topic or digest label above the title. Good News is signalled on the image. Titles, images and explicit read links lead to the same canonical story URL.

### Calls to action

- `NewsletterCta`: shared Weekly Digest signup component with `full` and `streamlined` variants. Both variants use the same headline and subscription form; the full variant adds supporting copy while the streamlined variant is the compact in-flow treatment.
- `TrainingBanner`: full-width editorial training promotion.
- `CoursePromotion`: course-specific sidebar promotion using the configured course colour.

Email controls visually combine a white input and pink action. Training and newsletter components suppress multicolour inline WILDNEWS branding so text inherits the CTA treatment.

### Footer

`SiteFooter` is the shared WildTeam footer. It uses a dark background, grouped About/Explore/Legal links, social icons, CPD mark and the WildTeam mission statement.

### Analytics consent

`AnalyticsConsent` is the shared public analytics notice. It uses the standard paper surface, quiet border, card radius and branded WILDNEWS wordmark, without a drop shadow. “Got it” uses the primary button treatment while “Opt out” is an unbordered pink text action. It stacks its actions on narrow phones and is not shown in the authenticated admin workspace. Closing the notice has the same effect as “Got it”; analytics remains enabled unless the visitor chooses “Opt out”. The “Cookie settings” control at the bottom of the footer's Legal menu reopens the same panel rather than introducing a second settings interface.

## Editorial page patterns

### News articles

The article template is shared by every published news story:

1. Centred hero with Good News/topic pills, title and compact coverage summary.
2. Full-width lead image with attribution.
3. “The story at a glance” introduction, discovery tags, update date and share controls. The controls form a vertical rail beside the introduction on desktop, then move above the discovery tags in a horizontal row at 1000px and below.
4. Structured editorial sections: what you need to know, why it matters, what happens next, what is known, what is unknown, and source reporting.
5. Sticky desktop sidebar containing coverage analysis and a course promotion.
6. Newsletter CTA and related-story discovery supplied by the page route.

Inline source references are numbered circles. Contextual links may point to relevant internal stories, taxonomy pages, courses or external sources. Links are not added merely to meet a quota.

### Digests

Daily and weekly digests share one template:

1. Full-width split hero with colour derived from the featured image and WildTeam purple as fallback.
2. Edition/date metadata, title, standfirst and AI-method link.
3. Digest and topic pills above the editorial introduction. Sharing remains a vertical rail beside the introduction on desktop, then moves into a horizontal row above these pills at 1000px and below.
4. Flowing editorial sections with wider supporting images.
5. One compact newsletter CTA within the body.
6. Source-article list, training banner and full newsletter CTA.
7. Six recent daily digests on daily editions.

Digest prose uses the same restrained contextual-link policy as news articles. A dedicated link-editor pass runs only after the prose is final and normally seeks two to four useful links in an article or three to five in a digest without enforcing a minimum. Standard articles accept no more than two article links; longer digests accept no more than three. Both accept one topic or approved-tag link, one genuinely relevant course link and one materially useful external source link, with five links maximum. Links use complete words or natural phrases, never repeat a target, and are omitted when they would feel forced. External links open in a new tab.

Friday produces a weekly edition instead of a daily edition.

### Archives

Topic, approved-tag, Good News and digest archives use the shared `ArchiveHero` component for their label, full-width title, description and result count. Its label row normalises spacing across differently sized topic, tag, Good News and digest pills. Archives then show one featured story followed by standard listing cards. Newsletter and related-story sections sit beneath the archive results where configured.

### Methodology pages

Coverage-analysis dimensions use three equal editorial columns on desktop, separated by the standard grey rule. At the shared tablet breakpoint they stack into a single column and replace vertical dividers with the existing horizontal section rules.

## Admin workspace

The admin uses the same font and core palette with denser typography. Desktop has an expanded left navigation; mobile uses a hamburger-controlled menu. Grouped navigation sections preserve their open state when the active child belongs to that group.

Admin pages use:

- Compact uppercase labels and metadata.
- White cards on a neutral page surface.
- Grey borders and subtle grey offset shadows.
- Disclosure panels for advanced or infrequent manual controls.
- Responsive tables, cards and stacked controls rather than shrinking desktop layouts below usability.

## Current implementation debt

These are recorded facts, not design changes:

- `app/globals.css` contains chronological layers of overrides, so an early declaration is not always the effective style.
- Some feature-specific colours remain local literals where they do not yet represent a reusable semantic role.
- The admin and public styles partly overlap in `globals.css`; admin consolidation is incomplete.
- Many feature-specific breakpoints repeat the same viewport widths.

Cleanup should consolidate these rules only after verifying that rendered desktop, tablet and mobile output remains unchanged.

