# WildNews project instructions

## Source of truth

WildNews is a standalone conservation-news application owned by WildTeam UK. It is developed in the `WildTeam-UK/conservation-news` GitHub repository, uses Supabase for data and authentication, and is deployed to Vercel. The checked-in application and its migrations are the source of truth.

Before changing the application:

1. Read `docs/ARCHITECTURE.md` for the current system boundaries and data flow.
2. Read `docs/DESIGN_SYSTEM.md` before changing public or admin UI.
3. Inspect the relevant existing component, route, styles and migration.
4. Extend or reuse an established pattern before creating a new one.

Do not redesign, rename, re-platform or introduce a parallel implementation unless the user explicitly requests it.

## Hosting and framework boundary

- WildNews is hosted by Vercel. Do not invoke ChatGPT Sites, publish through Sites, or introduce Sites templates, assets, manifests, project identifiers, plugins or dependencies.
- Do not add `.openai/hosting.json`, `@openai/sites-vite-plugin`, `sites()` build configuration, Sites authentication, Sites connectors, D1, R2 or Wrangler.
- Vinext, Vite and Nitro are part of the current Vercel application. Do not remove or replace them merely because they were also used by an earlier Sites starter.
- Use Supabase, not a second database or authentication service, unless an architectural change is explicitly approved.

## Design and components

- Treat `docs/DESIGN_SYSTEM.md` and the implemented application as the visual source of truth.
- Preserve the established WildTeam colour palette, VAG Rounded typography, spacing, responsive behaviour and editorial layouts.
- Reuse shared components such as navigation, footer, tags, badges, newsletter calls to action, training promotions, image credits and story discovery cards.
- Do not duplicate a component to make a small variation. Add a deliberate prop or shared variant when the existing component owns the pattern.
- Prefer existing CSS custom properties. Do not add unexplained literal colours, radii, shadows, font sizes or breakpoints.
- Do not add a new design system, component library or starter UI.
- Maintain keyboard focus, semantic HTML, reduced-motion support and responsive behaviour.

## Editorial and AI rules

- WILDNEWS uses AI to find, group and summarise source reporting. Never describe a briefing as original reporting.
- Preserve visible source attribution and links to underlying reporting.
- Never use an em dash (`—`) in generated editorial content. Use a comma, colon, semicolon or separate sentence.
- Reuse `AI_HOUSE_STYLE`, `aiInstructions` and `cleanAiText` for generated content.
- Do not force internal, external or training-course links where they are not contextually relevant.
- External editorial links open in a new tab with an appropriate `rel` value.

## Data and security

- Never commit credentials, API keys, tokens, passwords or real `.env` values.
- Browser code may use only `NEXT_PUBLIC_*` Supabase values. Service-role credentials and third-party API keys are server-only.
- Preserve Row Level Security and the distinction between public, authenticated-admin and service-role access.
- Add database changes as ordered SQL migrations in `supabase/migrations`. Do not rewrite migrations that have already run in production.
- Treat destructive SQL and irreversible data changes as high risk. Explain their scope and obtain the user's confirmation before execution.
- Do not expose raw service errors, secrets or private records through public API responses.

## Working practices

- Preserve unrelated user changes and inspect Git status before editing.
- Work on the branch chosen by the user. Do not push, merge, deploy or modify external services unless requested.
- Use `rg` or `rg --files` for repository searches and `apply_patch` for file edits.
- Prefer small, reviewable changes. For cleanup, remove one coherent dependency or subsystem at a time and verify before continuing.
- Avoid unnecessary redirects before launch. Update internal links to their canonical destination when a legacy route is removed.
- When adding or changing an environment variable, update `.env.example` and `docs/ARCHITECTURE.md` with its name and purpose, never its value.
- Give the user a concise GitHub Desktop commit summary and description for every completed batch.

## Required verification

Run checks proportionate to the change. The normal application checks are:

```text
pnpm exec tsc --noEmit
pnpm exec oxlint <changed files>
git diff --check
pnpm build
```

For public UI changes, also inspect representative desktop, tablet and mobile layouts. For pipeline, database, authentication or scheduling changes, verify the relevant admin workflow and preserve resumability, leases and cost safeguards.

