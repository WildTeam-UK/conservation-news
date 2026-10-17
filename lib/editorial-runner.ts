import { collectEnabledSources } from '@/lib/ingestion/rss';
import { assessUnprocessedItems } from '@/lib/openai/assess-news';
import { generateStoryDraft } from '@/lib/openai/draft-story';
import { estimateWebSearchCost } from '@/lib/openai/pricing';
import { researchCandidate } from '@/lib/openai/research-story';
import { queueReadyDrafts } from '@/lib/publication-queue';
import { enrichSourceSuggestionDescriptions, rebuildSourceSuggestionsFromResearch, scanBestSourceSuggestions } from '@/lib/source-discovery';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ASSESSMENT_RESERVE_USD = 0.03;
const RESEARCH_RESERVE_USD = 0.06;
const DRAFT_RESERVE_USD = 0.015;
// Vercel ends an automation request after 60 seconds and the database lease
// lasts 90 seconds. Three minutes leaves a full extra heartbeat for any late
// completion while recovering genuinely interrupted work promptly.
const STALE_STEP_MINUTES = 3;
const CANDIDATE_FRESHNESS_DAYS = 7;

type RunStatus = 'running' | 'completed' | 'partial' | 'failed' | 'budget_stopped';
type RunStage = 'collecting' | 'assessing' | 'researching' | 'drafting' | 'finished';
type ItemStatus = 'pending' | 'researching' | 'researched' | 'drafting' | 'drafted' | 'failed';

type EditorialRun = {
  id: string;
  status: RunStatus;
  current_stage: RunStage;
  max_new_drafts: number;
  max_estimated_cost_usd: number | string;
  estimated_cost_usd: number | string;
  candidates_selected: number;
  candidates_processed: number;
  drafts_created: number;
  failures: number;
  started_at: string;
  completed_at: string | null;
};

type RunItem = {
  id: string;
  cluster_id: string;
  story_id: string | null;
  rank: number;
  status: ItemStatus;
  research_cost_usd: number | string;
  draft_cost_usd: number | string;
  web_search_actions: number;
  error_message: string | null;
  updated_at: string;
  story_clusters: { working_title: string } | { working_title: string }[] | null;
};

type RunEvent = {
  id: number;
  stage: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  details: Record<string, unknown>;
  estimated_cost_usd: number | string;
  created_at: string;
};

export type EditorialRunSnapshot = {
  run: EditorialRun;
  items: RunItem[];
  events: RunEvent[];
  progressPercent: number;
  message: string;
};

const money = (value: number | string | null | undefined) => Number(value ?? 0);

function itemTitle(item: RunItem) {
  if (Array.isArray(item.story_clusters)) return item.story_clusters[0]?.working_title ?? 'Story candidate';
  return item.story_clusters?.working_title ?? 'Story candidate';
}

type RankedCandidate = {
  id: string;
  overall_score: number | null;
  relevance_score: number | null;
  created_at: string;
};

async function selectRecentUndraftedCandidates(limit: number) {
  const supabase = getSupabaseAdminClient();
  const cutoff = new Date(Date.now() - CANDIDATE_FRESHNESS_DAYS * 24 * 60 * 60_000);
  const { data: candidateRows, error: candidateError } = await supabase
    .from('story_clusters')
    .select('id, overall_score, relevance_score, created_at')
    .eq('status', 'selected')
    .order('overall_score', { ascending: false, nullsFirst: false })
    .limit(250);
  if (candidateError) throw candidateError;
  const candidates = (candidateRows ?? []) as RankedCandidate[];
  if (!candidates.length) return [];

  const candidateIds = candidates.map((candidate) => candidate.id);
  const [{ data: existingStories, error: storyError }, { data: clusterLinks, error: linkError }] = await Promise.all([
    supabase.from('stories').select('cluster_id').in('cluster_id', candidateIds),
    supabase.from('story_cluster_items').select('cluster_id, source_item_id').in('cluster_id', candidateIds),
  ]);
  if (storyError) throw storyError;
  if (linkError) throw linkError;

  const draftedIds = new Set((existingStories ?? []).flatMap((story) => story.cluster_id ? [story.cluster_id] : []));
  const sourceItemIds = [...new Set((clusterLinks ?? []).map((link) => link.source_item_id))];
  const { data: sourceItems, error: sourceError } = sourceItemIds.length
    ? await supabase.from('source_items').select('id, published_at, discovered_at').in('id', sourceItemIds)
    : { data: [], error: null };
  if (sourceError) throw sourceError;

  const sourceDates = new Map((sourceItems ?? []).map((item) => [item.id, item.published_at ?? item.discovered_at]));
  const latestDateByCluster = new Map<string, number>();
  for (const link of clusterLinks ?? []) {
    const date = Date.parse(sourceDates.get(link.source_item_id) ?? '');
    if (Number.isFinite(date)) latestDateByCluster.set(link.cluster_id, Math.max(latestDateByCluster.get(link.cluster_id) ?? 0, date));
  }

  return candidates
    .filter((candidate) => !draftedIds.has(candidate.id))
    .filter((candidate) => {
      const sourceDate = latestDateByCluster.get(candidate.id);
      return sourceDate ? sourceDate >= cutoff.getTime() : Date.parse(candidate.created_at) >= cutoff.getTime();
    })
    .sort((a, b) => Number(b.overall_score ?? 0) - Number(a.overall_score ?? 0) || Number(b.relevance_score ?? 0) - Number(a.relevance_score ?? 0) || Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, Math.max(1, Math.min(25, limit)));
}

async function addEvent(runId: string, stage: string, message: string, options: {
  level?: RunEvent['level'];
  details?: Record<string, unknown>;
  estimatedCostUsd?: number;
} = {}) {
  const { error } = await getSupabaseAdminClient().from('editorial_run_events').insert({
    run_id: runId,
    stage,
    level: options.level ?? 'info',
    message,
    details: options.details ?? {},
    estimated_cost_usd: options.estimatedCostUsd ?? 0,
  });
  if (error) throw error;
}

export async function getEditorialRunSnapshot(runId: string, message = ''): Promise<EditorialRunSnapshot> {
  const supabase = getSupabaseAdminClient();
  const [{ data: run, error: runError }, { data: items, error: itemsError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('editorial_runs').select('*').eq('id', runId).single(),
    supabase.from('editorial_run_items').select('id, cluster_id, story_id, rank, status, research_cost_usd, draft_cost_usd, web_search_actions, error_message, updated_at, story_clusters(working_title)').eq('run_id', runId).order('rank'),
    supabase.from('editorial_run_events').select('id, stage, level, message, details, estimated_cost_usd, created_at').eq('run_id', runId).order('created_at', { ascending: false }).limit(30),
  ]);
  if (runError || !run) throw runError ?? new Error('Editorial run not found.');
  if (itemsError) throw itemsError;
  if (eventsError) throw eventsError;

  const typedRun = run as EditorialRun;
  const typedItems = (items ?? []) as RunItem[];
  const finishedItems = typedItems.filter((item) => ['drafted', 'failed'].includes(item.status)).length;
  const baseProgress = typedRun.current_stage === 'collecting' ? 2 : typedRun.current_stage === 'assessing' ? 8 : 12;
  const itemProgress = typedItems.length ? (finishedItems / typedItems.length) * 88 : typedRun.status === 'running' ? 0 : 88;
  const progressPercent = typedRun.status === 'running' ? Math.min(99, Math.round(baseProgress + itemProgress)) : 100;

  return { run: typedRun, items: typedItems, events: (events ?? []) as RunEvent[], progressPercent, message };
}

export async function startEditorialRun(userId: string | null, maxNewDrafts: number, maxEstimatedCostUsd: number) {
  const supabase = getSupabaseAdminClient();
  const safeDrafts = Math.max(1, Math.min(25, Math.round(maxNewDrafts)));
  const safeBudget = Math.max(0.05, Math.min(100, Math.round(maxEstimatedCostUsd * 100) / 100));

  const { data: active } = await supabase.from('editorial_runs').select('id').eq('status', 'running').maybeSingle();
  if (active) return getEditorialRunSnapshot(active.id, 'Resumed the run already in progress.');

  const { error: settingsError } = await supabase.from('editorial_run_settings').upsert({
    id: true,
    max_new_drafts: safeDrafts,
    max_estimated_cost_usd: safeBudget,
    updated_by: userId,
  });
  if (settingsError) throw settingsError;

  const { data: budgetStopped } = await supabase
    .from('editorial_runs')
    .select('id, estimated_cost_usd')
    .eq('status', 'budget_stopped')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (budgetStopped && safeBudget > money(budgetStopped.estimated_cost_usd)) {
    const { data: unfinished } = await supabase
      .from('editorial_run_items')
      .select('status')
      .eq('run_id', budgetStopped.id)
      .in('status', ['pending', 'researched'])
      .limit(1);
    if (unfinished?.length) {
      const nextStage = unfinished[0].status === 'researched' ? 'drafting' : 'researching';
      const { error: resumeError } = await supabase.from('editorial_runs').update({
        status: 'running',
        current_stage: nextStage,
        max_new_drafts: safeDrafts,
        max_estimated_cost_usd: safeBudget,
        completed_at: null,
        error_summary: null,
      }).eq('id', budgetStopped.id);
      if (resumeError) throw resumeError;
      await addEvent(budgetStopped.id, 'run', `Budget-stopped run resumed with a new $${safeBudget.toFixed(2)} estimated limit.`, {
        details: { max_estimated_cost_usd: safeBudget },
      });
      return getEditorialRunSnapshot(budgetStopped.id, 'Resumed the budget-stopped run.');
    }
  }

  const { data: run, error } = await supabase.from('editorial_runs').insert({
    trigger_type: 'manual',
    status: 'running',
    current_stage: 'collecting',
    max_new_drafts: safeDrafts,
    max_estimated_cost_usd: safeBudget,
    triggered_by: userId,
  }).select('id').single();
  if (error || !run) throw error ?? new Error('Could not create the editorial run.');
  await addEvent(run.id, 'run', `Run started with a limit of ${safeDrafts} new drafts and a $${safeBudget.toFixed(2)} estimated budget.`, {
    details: { max_new_drafts: safeDrafts, max_estimated_cost_usd: safeBudget },
  });
  return getEditorialRunSnapshot(run.id, 'Run started.');
}

async function stopForBudget(run: EditorialRun, nextStage: string, reserve: number) {
  const spent = money(run.estimated_cost_usd);
  const budget = money(run.max_estimated_cost_usd);
  if (spent + reserve <= budget) return false;

  const supabase = getSupabaseAdminClient();
  await supabase.from('editorial_runs').update({
    status: 'budget_stopped',
    current_stage: 'finished',
    completed_at: new Date().toISOString(),
    error_summary: `Stopped before ${nextStage}: the next step was projected to exceed the run budget.`,
  }).eq('id', run.id);
  await addEvent(run.id, nextStage, `Budget safeguard stopped the run before ${nextStage}.`, {
    level: 'warning',
    details: { spent, budget, reserved_for_next_step: reserve },
  });
  return true;
}

async function finishRun(run: EditorialRun) {
  const status: RunStatus = run.failures > 0 ? 'partial' : 'completed';
  await getSupabaseAdminClient().from('editorial_runs').update({
    status,
    current_stage: 'finished',
    completed_at: new Date().toISOString(),
  }).eq('id', run.id);
  await addEvent(run.id, 'run', status === 'completed' ? 'Daily editorial run completed.' : 'Run completed with one or more failed stories.', { level: status === 'partial' ? 'warning' : 'info' });
  try {
    const queued = await queueReadyDrafts(run.id);
    if (queued.queued || queued.held) {
      await addEvent(run.id, 'publishing', `${queued.queued} drafts entered the automatic publishing queue; ${queued.held} were held for review.`, {
        level: queued.held ? 'warning' : 'info',
        details: queued,
      });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown publication queue error.';
    await addEvent(run.id, 'publishing', 'Drafting completed, but the automatic publishing queue could not be updated.', {
      level: 'error',
      details: { error: detail },
    });
  }
  await refreshSourceRecommendations(run.id);
}

async function refreshSourceRecommendations(runId: string) {
  try {
    const rebuilt = await rebuildSourceSuggestionsFromResearch();
    const enriched = await enrichSourceSuggestionDescriptions();
    const scanned = await scanBestSourceSuggestions(8);
    await addEvent(runId, 'sources', `Source recommendations updated automatically; ${scanned.found} usable RSS ${scanned.found === 1 ? 'feed was' : 'feeds were'} found.`, {
      details: { suggestions: rebuilt.suggestions, descriptions_created: enriched.described, feeds_checked: scanned.checked, feeds_found: scanned.found },
    });
  } catch (error) {
    await addEvent(runId, 'sources', 'The editorial run completed, but source recommendations could not be refreshed.', {
      level: 'warning',
      details: { error: error instanceof Error ? error.message : 'Unknown source recommendation error.' },
    });
  }
}

async function recoverStaleItems(runId: string) {
  const supabase = getSupabaseAdminClient();
  const staleBefore = new Date(Date.now() - STALE_STEP_MINUTES * 60_000).toISOString();
  const { data: stale } = await supabase.from('editorial_run_items').select('id, status').eq('run_id', runId).in('status', ['researching', 'drafting']).lt('updated_at', staleBefore);
  for (const item of stale ?? []) {
    const nextStatus = item.status === 'researching' ? 'pending' : 'researched';
    await supabase.from('editorial_run_items').update({ status: nextStatus, error_message: 'Recovered after an interrupted request.' }).eq('id', item.id);
    await addEvent(runId, item.status, 'Recovered an interrupted step and made it ready to retry.', { level: 'warning', details: { item_id: item.id } });
  }
}

export async function advanceEditorialRun(runId: string, userId: string | null): Promise<EditorialRunSnapshot> {
  const supabase = getSupabaseAdminClient();
  const { data: leaseToken, error: leaseError } = await supabase.rpc('claim_editorial_run_step', { target_run_id: runId, lease_seconds: 90 });
  if (leaseError) throw leaseError;
  if (!leaseToken) return getEditorialRunSnapshot(runId, 'Another request is already advancing this run.');

  try {
  await recoverStaleItems(runId);
  const { data: runData, error: runError } = await supabase.from('editorial_runs').select('*').eq('id', runId).single();
  if (runError || !runData) throw runError ?? new Error('Editorial run not found.');
  let run = runData as EditorialRun;
  if (run.status !== 'running') return getEditorialRunSnapshot(run.id, 'This run is no longer active.');

  if (run.current_stage === 'collecting') {
    const result = await collectEnabledSources('manual');
    await supabase.from('editorial_runs').update({ ingestion_run_id: result.runId, current_stage: 'assessing' }).eq('id', run.id);
    await addEvent(run.id, 'collecting', `Checked ${result.sourcesChecked} sources and found ${result.itemsNew} new items.`, {
      level: result.status === 'completed' ? 'info' : 'warning',
      details: result,
    });
    return getEditorialRunSnapshot(run.id, 'Collection complete. Assessing the new inbox next.');
  }

  if (run.current_stage === 'assessing') {
    if (await stopForBudget(run, 'assessment', ASSESSMENT_RESERVE_USD)) return getEditorialRunSnapshot(run.id, 'Stopped at the budget safeguard.');
    const result = await assessUnprocessedItems();
    const nextCost = money(run.estimated_cost_usd) + result.estimatedCostUsd;
    if (result.remainingItems > 0) {
      await supabase.from('editorial_runs').update({ estimated_cost_usd: nextCost }).eq('id', run.id);
      await addEvent(run.id, 'assessing', `Assessed a batch of ${result.assessedItems} items; ${result.remainingItems} recent items remain.`, {
        details: { assessed_items: result.assessedItems, new_candidates: result.selected, matched_items: result.matchedItems, updates_flagged: result.updatesFlagged, expired_items: result.expiredItems, remaining_items: result.remainingItems },
        estimatedCostUsd: result.estimatedCostUsd,
      });
      return getEditorialRunSnapshot(run.id, `Assessed ${result.assessedItems} items. ${result.remainingItems} remain in the recent backlog.`);
    }

    const shortlist = await selectRecentUndraftedCandidates(run.max_new_drafts);
    if (shortlist.length) {
      const { error: itemError } = await supabase.from('editorial_run_items').insert(shortlist.map((candidate, index) => ({
        run_id: run.id,
        cluster_id: candidate.id,
        rank: index + 1,
        status: 'pending',
      })));
      if (itemError) throw itemError;
    }
    const completed = shortlist.length === 0;
    await supabase.from('editorial_runs').update({
      current_stage: completed ? 'finished' : 'researching',
      status: completed ? 'completed' : 'running',
      completed_at: completed ? new Date().toISOString() : null,
      candidates_selected: shortlist.length,
      estimated_cost_usd: nextCost,
    }).eq('id', run.id);
    await addEvent(run.id, 'assessing', `Assessed ${result.assessedItems} new items, then selected the top ${shortlist.length} recent undrafted candidates.`, {
      details: { assessed_items: result.assessedItems, new_candidates: result.selected, rejected: result.rejected, matched_items: result.matchedItems, updates_flagged: result.updatesFlagged, expired_items: result.expiredItems, recent_pool_shortlist: shortlist.length, freshness_days: CANDIDATE_FRESHNESS_DAYS },
      estimatedCostUsd: result.estimatedCostUsd,
    });
    if (completed) {
      await addEvent(run.id, 'run', 'Run completed because there were no new qualifying candidates.');
      await refreshSourceRecommendations(run.id);
    }
    return getEditorialRunSnapshot(run.id, completed ? 'No new qualifying candidates were found.' : 'Assessment complete. Researching the first candidate next.');
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('editorial_run_items')
    .select('id, cluster_id, story_id, rank, status, research_cost_usd, draft_cost_usd, web_search_actions, error_message, updated_at, story_clusters(working_title)')
    .eq('run_id', run.id)
    .order('rank');
  if (itemsError) throw itemsError;
  const items = (itemRows ?? []) as RunItem[];

  const readyToDraft = items.find((item) => item.status === 'researched');
  if (readyToDraft) {
    if (await stopForBudget(run, 'drafting', DRAFT_RESERVE_USD)) return getEditorialRunSnapshot(run.id, 'Stopped at the budget safeguard.');
    await supabase.from('editorial_run_items').update({ status: 'drafting', error_message: null }).eq('id', readyToDraft.id);
    await supabase.from('editorial_runs').update({ current_stage: 'drafting' }).eq('id', run.id);
    try {
      const result = await generateStoryDraft(readyToDraft.cluster_id, userId);
      const cost = result.alreadyCompleted ? 0 : result.estimatedCostUsd;
      const nextCost = money(run.estimated_cost_usd) + cost;
      await supabase.from('editorial_run_items').update({ status: 'drafted', story_id: result.storyId, draft_cost_usd: cost }).eq('id', readyToDraft.id);
      await supabase.from('editorial_runs').update({
        current_stage: 'researching',
        estimated_cost_usd: nextCost,
        candidates_processed: run.candidates_processed + 1,
        drafts_created: run.drafts_created + (result.alreadyCompleted ? 0 : 1),
      }).eq('id', run.id);
      await addEvent(run.id, 'drafting', `Draft created: ${result.headline}`, { details: { cluster_id: readyToDraft.cluster_id, story_id: result.storyId }, estimatedCostUsd: cost });
      return getEditorialRunSnapshot(run.id, `Draft ${run.drafts_created + 1} of ${run.candidates_selected} created.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown drafting error.';
      await supabase.from('editorial_run_items').update({ status: 'failed', error_message: detail.slice(0, 1000) }).eq('id', readyToDraft.id);
      await supabase.from('editorial_runs').update({ current_stage: 'researching', candidates_processed: run.candidates_processed + 1, failures: run.failures + 1 }).eq('id', run.id);
      await addEvent(run.id, 'drafting', `Drafting failed for ${itemTitle(readyToDraft)}.`, { level: 'error', details: { error: detail, cluster_id: readyToDraft.cluster_id } });
      return getEditorialRunSnapshot(run.id, 'One draft failed; the remaining candidates can continue.');
    }
  }

  const readyToResearch = items.find((item) => item.status === 'pending');
  if (readyToResearch) {
    const completedResearch = items.filter((item) => money(item.research_cost_usd) > 0);
    const observedAverage = completedResearch.length ? completedResearch.reduce((sum, item) => sum + money(item.research_cost_usd), 0) / completedResearch.length : 0;
    const reserve = Math.max(RESEARCH_RESERVE_USD, observedAverage * 1.25);
    if (await stopForBudget(run, 'researching', reserve)) return getEditorialRunSnapshot(run.id, 'Stopped at the budget safeguard.');
    await supabase.from('editorial_run_items').update({ status: 'researching', error_message: null }).eq('id', readyToResearch.id);
    await supabase.from('editorial_runs').update({ current_stage: 'researching' }).eq('id', run.id);
    try {
      const result = await researchCandidate(readyToResearch.cluster_id);
      const cost = result.alreadyCompleted ? 0 : result.estimatedTokenCostUsd + estimateWebSearchCost(result.searchActions);
      const nextCost = money(run.estimated_cost_usd) + cost;
      await supabase.from('editorial_run_items').update({ status: 'researched', research_cost_usd: cost, web_search_actions: result.searchActions }).eq('id', readyToResearch.id);
      await supabase.from('editorial_runs').update({ current_stage: 'drafting', estimated_cost_usd: nextCost }).eq('id', run.id);
      await addEvent(run.id, 'researching', `Research completed for ${itemTitle(readyToResearch)}.`, {
        details: { cluster_id: readyToResearch.cluster_id, sources: result.sourceCount, web_search_actions: result.searchActions },
        estimatedCostUsd: cost,
      });
      return getEditorialRunSnapshot(run.id, 'Research complete. Creating its private draft next.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown research error.';
      await supabase.from('editorial_run_items').update({ status: 'failed', error_message: detail.slice(0, 1000) }).eq('id', readyToResearch.id);
      await supabase.from('editorial_runs').update({ candidates_processed: run.candidates_processed + 1, failures: run.failures + 1 }).eq('id', run.id);
      await addEvent(run.id, 'researching', `Research failed for ${itemTitle(readyToResearch)}.`, { level: 'error', details: { error: detail, cluster_id: readyToResearch.cluster_id } });
      return getEditorialRunSnapshot(run.id, 'One research step failed; the remaining candidates can continue.');
    }
  }

  if (items.some((item) => ['researching', 'drafting'].includes(item.status))) {
    return getEditorialRunSnapshot(run.id, 'Waiting for an in-progress step to finish or become ready for recovery.');
  }

  run = { ...run, failures: items.filter((item) => item.status === 'failed').length };
  await finishRun(run);
  return getEditorialRunSnapshot(run.id, run.failures ? 'Run completed with some failed candidates.' : 'Run completed successfully.');
  } finally {
    await supabase.rpc('release_editorial_run_step', { target_run_id: runId, target_lease_token: leaseToken });
  }
}
