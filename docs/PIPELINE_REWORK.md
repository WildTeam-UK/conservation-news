# WildNews pipeline rework

## Purpose

This rework keeps the existing Supabase, Vercel, OpenAI, Buffer and Brevo architecture while making the editorial pipeline more resilient, current, transparent and capable of improving from evidence over time.

The core operating model is deliberately simple:

- Collect continuously and assess every eligible item.
- Keep every qualifying candidate, but research and draft only the best current candidates needed for that day's publication capacity.
- Run the daily editorial selection shortly before the publication window so the shortlist is current.
- Publish no more articles than the system drafted for that day.
- Preserve evidence and audit history while pruning bulky, replaceable payloads.
- Measure source and content outcomes before allowing the system to tune itself automatically.

## Decisions

### Collection

- Source collection remains RSS-first and uses the existing ingestion tables.
- A collection run is split into durable per-source tasks rather than checking every source sequentially in one request.
- Each heartbeat claims a bounded batch. Checks run with bounded concurrency so one slow source cannot make the complete run exceed the Vercel request limit.
- The initial defaults are 10 sources per heartbeat, five concurrent fetches and the existing 20-second per-feed timeout.
- A failed source is recorded independently and does not restart successful source checks.
- Interrupted tasks become claimable again after a lease expires.
- Manual collection uses the same resumable mechanism as scheduled collection.

### Data retention

- Source records, canonical URLs, hashes, assessment outcomes and links used for provenance remain available for audit, deduplication and source learning.
- Bulky `raw_content` is cleared after 30 days when an assessed item is not evidence for an article, research pack or pending coverage update.
- Fully unreferenced, expired source-item records may be removed after 365 days.
- Records supporting a draft, published article or unresolved update are not deleted by retention work.
- Cleanup is incremental, logged and limited per heartbeat. It is not a large blocking delete.

### Assessment and candidates

- Assessment continues until every current unprocessed item has an outcome. Candidate creation is not capped by the daily draft limit.
- Qualifying clusters remain candidates until drafted, rejected or stale.
- Candidates older than seven days are excluded from the active Candidates page and from automated selection. Their records remain available for audit.
- Ranking uses an effective score rather than the original overall score alone. The initial freshness decay is two points per complete day since the latest supporting source.
- A modest wildlife relevance bonus of up to three points may improve ordering, but cannot make a weak wildlife story outrank substantially stronger conservation reporting.
- Geography is recorded for discovery and future regional archives, not used as a ranking factor.
- The daily run selects only the strongest eligible candidates needed to fill that day's configured publication capacity.

Implementation note: the freshness window, daily decay and wildlife bonus are configurable in the existing daily workflow settings. Effective scores are calculated dynamically, while the original assessment score is preserved for audit.

### Daily editorial run and publication

- `max_new_drafts` and `max_auto_publishes_per_day` become one daily article target in the admin experience and workflow.
- With the current 08:00 UK publication-window start, the default editorial run moves to 07:00 UK time.
- The run collects the latest sources, completes assessment, ranks the full eligible candidate pool, and researches and drafts up to the daily target.
- Successful drafts are scheduled only inside that day's remaining publication window.
- The normal workflow does not build a queue for future days. Failed or held work remains visible for review and does not silently consume a later day's slot.
- Existing leases, idempotency safeguards, cost limits and publication checks remain in force.

### Coverage updates and article history

- New coverage matched to an existing draft or published article is reviewable in the admin area.
- An editor can dismiss it, mark it as reviewed with no article change, or use it to prepare an editorial update.
- A published article remains live while an update is prepared and reviewed.
- Applying an editorial update creates an audit record with a concise public-facing summary of what changed.
- `published_at` is preserved for every edit, including featured-image and metadata changes.
- Only an applied editorial content update sets `editorial_updated_at`.
- Updated articles display their original publication date, editorial update date and a “What changed” section. They do not move to the top of chronological archives merely because they were edited.

### Source transparency and improvement

- Article pages state clearly that WildNews synthesises and summarises source reporting, and link to the underlying sources. Digests retain their existing cleaner presentation.
- Source performance is measured from collection through publication: items collected, duplicates, assessment outcomes, candidates, research use, article use, update use and recent contribution share.
- The source workspace presents coverage gaps, repeated failures, low-yield sources and outlet-dominance warnings.
- An initial dominance warning appears when one outlet supplies more than 25% of at least 20 published news articles in a rolling 30-day period.
- Recommendations are advisory at first. Editors can accept or dismiss them, creating calibration evidence.
- Source-specific penalties are not applied during candidate ranking. Weaknesses and dominance are addressed upstream by improving the monitored source network.
- Automatic source-list changes are deferred until recommendation outcomes show that the rules are reliable.

### Digests

- Digest generation moves to 09:00 UK time so the daily edition works as a morning conservation briefing.
- Daily selection covers the completed reporting period since the previous edition rather than relying on a vague reference to “today”.
- Weekly digests choose the best 25 eligible articles from the period, not simply the 25 most recent.
- Weekly selection applies soft topical, geographic and source-diversity balancing without forcing false balance or excluding the strongest developments.
- Existing social and email generation, validation, duplicate prevention and delivery integrations remain unchanged unless their inputs need adapting.

### Feedback and reporting

- Article and digest pages collect simple positive or negative usefulness feedback.
- Views, outbound source clicks, digest clicks and share interactions feed aggregated performance reporting without collecting unnecessary personal data.
- Buffer performance data can join the same reporting model when the available API fields are confirmed.
- A concise operational summary can report successful runs, costs, failures, held work and recommendations, including an “all clear” message when no action is needed.

## Implementation batches

### Batch 1: resilient collection and retention foundation

1. Add per-source ingestion task state, leases and supporting indexes.
2. Replace sequential collection with resumable bounded batches.
3. Add incremental safe retention functions and run logging.
4. Update collection admin status and recovery messaging.
5. Verify manual and scheduled collection, interruption recovery and cost-neutral operation.

### Batch 2: candidate lifecycle and ranking

1. Add configurable freshness and wildlife-bonus settings.
2. Calculate and expose effective candidate scores.
3. Hide stale candidates from the active list while preserving their audit records.
4. Remove any candidate-creation coupling to the daily draft limit.
5. Verify ordering against recent and older real candidates.

### Batch 3: one-day editorial and publishing plan

1. Unify the daily draft and publication targets.
2. Move the scheduled run to 07:00 UK time.
3. Schedule only within the current day's remaining window.
4. Preserve held-work review and all publishing safeguards.
5. Migrate or cancel existing future queue entries explicitly before enabling the new behaviour.

Implementation note: `max_new_drafts` remains the backward-compatible database field, but is presented and used as the single daily article target. Saving it also mirrors the legacy publication-limit column so older code cannot drift. The scheduler plans only the current London day and scopes automatic queueing to stories produced by that editorial run.

### Batch 4: coverage review and revision history

1. Add update decisions, article revision metadata and public change summaries.
2. Build admin review actions for pending coverage.
3. Preserve `published_at` for all edits.
4. Add the public first-published, updated and “What changed” presentation.
5. Backfill no editorial update timestamps automatically.

Implementation note: pending coverage now has explicit dismiss, reviewed-with-no-change and prepare-revision decisions. A prepared revision is stored separately from the live article and can collect more than one matched source. Applying it atomically records the source decisions and revision audit, updates the story without changing `published_at`, and sets the public editorial update date and “What changed” summary only when the story is already published. Routine corrections and image or metadata edits do not create an editorial update timestamp, and no historical timestamps are inferred.

### Batch 5: source intelligence

1. Add source performance aggregates and rolling contribution measures.
2. Redesign the source workspace around health, yield, use and coverage.
3. Add dominance and coverage-gap recommendations with accept and dismiss outcomes.
4. Keep recommendations manual until enough calibration evidence exists.

Implementation note: the source workspace now uses an RLS-respecting aggregate view to show collection health, 30-day candidate yield, research use, published use, update use and rolling contribution. A completed run refreshes deterministic dominance, repeated-failure, low-yield and topic-coverage signals. Accept and dismiss decisions are stored as calibration evidence and never change source settings or candidate scores. Public news briefings now state that WildNews synthesises and summarises the linked source reporting; digests are unchanged.

### Batch 6: digest selection and timing

1. Move digest generation to 09:00 UK time.
2. Implement scored and diversified weekly selection of up to 25 articles.
3. Make daily reporting periods explicit and retry-safe.
4. Regression-test Buffer and Brevo distribution without live test publication.

Implementation note: the scheduled run now stores the preceding London-local edition window explicitly and treats its end as exclusive, so the same story cannot fall into adjacent editions and retries cannot drift onto newer evidence. Daily over-capacity selection uses existing editorial evidence scores. Weekly selection considers the full eligible period, then applies soft topic, place and primary-source repetition penalties while retaining the strongest developments. Selection scores and adjustments are recorded in the digest event audit. Existing Buffer and Brevo delivery records, leases and duplicate-prevention behaviour are unchanged.

### Batch 7: feedback and operational learning

1. Add privacy-conscious usefulness feedback and interaction events.
2. Build aggregated article, digest, source and social outcome reporting.
3. Add the concise operational health summary.
4. Define evidence thresholds before enabling any automatic source-list changes.

Implementation note: published pages submit anonymous, idempotent interaction events through a validated server-only write path. The event model stores no IP address, account ID, user agent, referrer or persistent visitor identifier. Passive events follow the existing analytics opt-out; an explicit usefulness vote remains available and is remembered only on that browser. The Insights workspace aggregates 30-day content and source outcomes, reports internal Buffer and Brevo delivery outcomes, and summarises seven-day operational health and estimated AI cost. Buffer engagement metrics remain deferred until supported provider fields are confirmed.

Automatic source-list changes are database-locked off. The initial evidence gate requires at least 90 days of observation, 20 reviewed recommendations, 10 decisions for every recommendation rule and an acceptance rate of at least 80%. Meeting those thresholds does not itself enable automation; a separate reviewed migration is still required.

## Explicitly deferred

- High-score breaking-news notifications.
- Live event reporting, including the proposed COP-style live text format.
- Geography as an editorial ranking factor.
- Parent-region taxonomy thresholds until the geographic tag set is mature.
- Automatically accepting source-network recommendations. Coverage updates now use a separately switchable, leased and retry-limited automation path; failures return to the existing editorial review workspace.
- Automatically changing source weights from early engagement data.

## Migration and release rules

- Each database batch uses a new ordered migration and can be deployed before its application code without changing existing behaviour.
- New behaviour remains disabled or backward-compatible until its corresponding application batch is deployed.
- Destructive retention and future-queue cleanup are never run implicitly by a schema migration.
- Production migrations are applied only after the user approves the reviewed SQL.
- Every batch must pass TypeScript, targeted linting, `git diff --check`, a production build and the relevant authenticated admin workflow.
- Pipeline changes must preserve resumability, leases, idempotency, cost limits, RLS and service-role boundaries.
