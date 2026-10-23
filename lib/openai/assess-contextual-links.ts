import { buildArticleLinkTargets } from '@/lib/article-link-candidates';
import { articleLinkRows, evaluateArticleLinkPlan, type LinkPlanDiagnostics } from '@/lib/article-linking';
import { evaluateDigestLinkPlan } from '@/lib/digest-linking';
import type { StoryDraftContent } from '@/lib/openai/draft-story';
import { CONTEXTUAL_LINK_PROMPT_VERSION, planArticleContextualLinks, planDigestContextualLinks } from '@/lib/openai/plan-contextual-links';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { TrainingCoursePromotion } from '@/lib/training-courses';
import type { DigestContent, DigestSourceStory } from '@/lib/digests';

type LinkableContentType = 'news' | 'daily_digest' | 'weekly_digest';

type LinkingAssessmentResult = {
  storyId: string;
  contentType: LinkableContentType;
  status: 'completed' | 'failed';
  proposedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  estimatedCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
};

type StoryMetadata = {
  article_content?: StoryDraftContent;
  digest_content?: DigestContent;
  digest_source_stories?: DigestSourceStory[];
  [key: string]: unknown;
};

function emptyDiagnostics(): LinkPlanDiagnostics {
  return { proposedCount: 0, acceptedCount: 0, rejectedCount: 0, rejectionReasons: {}, acceptedTypes: {} };
}

function clearArticleLinks(content: StoryDraftContent) {
  const copy = structuredClone(content);
  for (const item of [...copy.key_takeaways, ...copy.what_we_know, ...copy.what_we_dont_know, copy.why_it_matters, copy.what_happens_next]) delete item.links;
  return copy;
}

async function activeCourses() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('training_courses')
    .select('id, title, short_title, description, course_url, primary_colour, ad_headline, ad_description, cta_label, matching_guidance, matching_terms')
    .eq('active', true)
    .order('display_order')
    .order('title');
  if (error) throw error;
  return (data ?? []) as (TrainingCoursePromotion & { matching_guidance: string; matching_terms: string[] })[];
}

async function saveAssessment(
  storyId: string,
  status: 'completed' | 'failed',
  diagnostics: LinkPlanDiagnostics,
  usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number },
  errorSummary: string | null,
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('story_linking_assessments').upsert({
    story_id: storyId,
    prompt_version: CONTEXTUAL_LINK_PROMPT_VERSION,
    status,
    proposed_count: diagnostics.proposedCount,
    link_count: diagnostics.acceptedCount,
    rejected_count: diagnostics.rejectedCount,
    rejection_reasons: diagnostics.rejectionReasons,
    accepted_types: diagnostics.acceptedTypes,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_usd: usage.estimatedCostUsd,
    error_summary: errorSummary,
    assessed_at: new Date().toISOString(),
  }, { onConflict: 'story_id' });
  if (error) throw error;
}

async function assessArticle(storyId: string, metadata: StoryMetadata): Promise<LinkingAssessmentResult> {
  const supabase = getSupabaseAdminClient();
  const { migrateDraftContent } = await import('@/lib/openai/draft-story');
  const content = clearArticleLinks(migrateDraftContent(metadata.article_content));
  const [{ data: tagRows, error: tagsError }, { data: sourceRows, error: sourcesError }, courses] = await Promise.all([
    supabase.from('story_tags').select('tag_id').eq('story_id', storyId),
    supabase.from('story_sources').select('id, source_name, source_title, source_url').eq('story_id', storyId).order('display_order'),
    activeCourses(),
  ]);
  if (tagsError) throw tagsError;
  if (sourcesError) throw sourcesError;
  const targets = await buildArticleLinkTargets({
    topics: content.topics,
    tagIds: [...new Set((tagRows ?? []).map((tag) => tag.tag_id))],
    courses,
    sources: (sourceRows ?? []).map((source) => ({ id: source.id, title: source.source_title, publisher: source.source_name, url: source.source_url })),
    excludeStoryId: storyId,
  });
  const planned = await planArticleContextualLinks(content, targets);
  const evaluated = evaluateArticleLinkPlan(content, planned.plan, targets);
  const rows = articleLinkRows(storyId, evaluated.article);

  const { error: clearError } = await supabase.from('story_contextual_links').delete().eq('story_id', storyId);
  if (clearError) throw clearError;
  if (rows.length) {
    const { error: insertError } = await supabase.from('story_contextual_links').insert(rows);
    if (insertError) throw insertError;
  }
  const contextualCourse = rows.find((row) => row.link_type === 'course');
  const { error: clearCourseError } = await supabase.from('story_course_recommendations').delete().eq('story_id', storyId).eq('placement', 'contextual');
  if (clearCourseError) throw clearCourseError;
  if (contextualCourse) {
    const { error: courseError } = await supabase.from('story_course_recommendations').insert({
      story_id: storyId,
      course_id: contextualCourse.target_id,
      placement: 'contextual',
      confidence: contextualCourse.confidence,
      rationale: contextualCourse.rationale,
      anchor_text: contextualCourse.anchor_text,
      target_section: contextualCourse.section_key,
    });
    if (courseError) throw courseError;
  }
  await saveAssessment(storyId, 'completed', evaluated.diagnostics, planned, null);
  return {
    storyId,
    contentType: 'news',
    status: 'completed',
    proposedCount: evaluated.diagnostics.proposedCount,
    acceptedCount: evaluated.diagnostics.acceptedCount,
    rejectedCount: evaluated.diagnostics.rejectedCount,
    estimatedCostUsd: planned.estimatedCostUsd,
    inputTokens: planned.inputTokens,
    outputTokens: planned.outputTokens,
  };
}

async function assessDigest(storyId: string, contentType: 'daily_digest' | 'weekly_digest', metadata: StoryMetadata): Promise<LinkingAssessmentResult> {
  const supabase = getSupabaseAdminClient();
  const content = structuredClone(metadata.digest_content);
  const sourceStories = metadata.digest_source_stories ?? [];
  if (!content?.sections?.length || !sourceStories.length) throw new Error('The digest does not contain linkable editorial content.');
  content.contextual_links = [];
  const sourceStoryIds = sourceStories.map((story) => story.id);
  const [{ data: tagRows, error: tagsError }, { data: sourceRows, error: sourcesError }, courses] = await Promise.all([
    supabase.from('story_tags').select('tag_id').in('story_id', sourceStoryIds),
    supabase.from('story_sources').select('id, source_name, source_title, source_url').in('story_id', sourceStoryIds),
    activeCourses(),
  ]);
  if (tagsError) throw tagsError;
  if (sourcesError) throw sourcesError;
  const discoveredTargets = await buildArticleLinkTargets({
    topics: [...new Set(sourceStories.flatMap((story) => story.topics ?? []))],
    tagIds: [...new Set((tagRows ?? []).map((tag) => tag.tag_id))],
    courses,
    sources: [...new Map((sourceRows ?? []).map((source) => [source.source_url, source])).values()]
      .map((source) => ({ id: source.id, title: source.source_title, publisher: source.source_name, url: source.source_url })),
    excludeStoryId: storyId,
  });
  const sourceStoryTargets = sourceStories.map((story) => ({ id: story.id, type: 'article' as const, href: `/stories/${story.slug}`, title: story.headline, description: story.standfirst, external: false }));
  const targets = [...new Map([...sourceStoryTargets, ...discoveredTargets].map((target) => [`${target.type}:${target.id}`, target])).values()];
  const planned = await planDigestContextualLinks(content, targets);
  const evaluated = evaluateDigestLinkPlan(content, planned.plan, targets);
  content.contextual_links = evaluated.links;
  const { error: updateError } = await supabase.from('stories').update({ generation_metadata: { ...metadata, digest_content: content } }).eq('id', storyId);
  if (updateError) throw updateError;
  await saveAssessment(storyId, 'completed', evaluated.diagnostics, planned, null);
  return {
    storyId,
    contentType,
    status: 'completed',
    proposedCount: evaluated.diagnostics.proposedCount,
    acceptedCount: evaluated.diagnostics.acceptedCount,
    rejectedCount: evaluated.diagnostics.rejectedCount,
    estimatedCostUsd: planned.estimatedCostUsd,
    inputTokens: planned.inputTokens,
    outputTokens: planned.outputTokens,
  };
}

export async function assessStoryContextualLinks(storyId: string): Promise<LinkingAssessmentResult> {
  const supabase = getSupabaseAdminClient();
  const { data: story, error } = await supabase.from('stories').select('id, content_type, generation_metadata').eq('id', storyId).single();
  if (error || !story) throw error ?? new Error('Story not found.');
  const contentType = story.content_type as LinkableContentType;
  if (!['news', 'daily_digest', 'weekly_digest'].includes(contentType)) throw new Error('This content type does not support contextual linking.');
  const metadata = (story.generation_metadata ?? {}) as StoryMetadata;
  try {
    return contentType === 'news'
      ? await assessArticle(storyId, metadata)
      : await assessDigest(storyId, contentType, metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contextual-link assessment failed.';
    try {
      await saveAssessment(storyId, 'failed', emptyDiagnostics(), { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 }, message.slice(0, 1000));
    } catch {
      // Preserve the original error when the diagnostics migration has not run yet.
    }
    return { storyId, contentType, status: 'failed', proposedCount: 0, acceptedCount: 0, rejectedCount: 0, estimatedCostUsd: 0, inputTokens: 0, outputTokens: 0, error: message };
  }
}

export async function assessContextualLinkBatch(limit = 5, retryFailed = false) {
  const supabase = getSupabaseAdminClient();
  const [{ data: stories, error: storiesError }, { data: assessments, error: assessmentsError }] = await Promise.all([
    supabase.from('stories').select('id, content_type, published_at, created_at').in('content_type', ['news', 'daily_digest', 'weekly_digest']).in('status', ['draft', 'published']).order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    supabase.from('story_linking_assessments').select('story_id, prompt_version, status'),
  ]);
  if (storiesError) throw storiesError;
  if (assessmentsError) throw assessmentsError;
  const assessmentByStory = new Map((assessments ?? []).map((assessment) => [assessment.story_id, assessment]));
  const candidates = (stories ?? []).filter((story) => {
    const assessment = assessmentByStory.get(story.id);
    if (retryFailed) return assessment?.prompt_version === CONTEXTUAL_LINK_PROMPT_VERSION && assessment.status === 'failed';
    return !assessment || assessment.prompt_version !== CONTEXTUAL_LINK_PROMPT_VERSION;
  });
  const selected = candidates.slice(0, Math.max(1, Math.min(10, limit)));
  const results: LinkingAssessmentResult[] = [];
  for (const story of selected) results.push(await assessStoryContextualLinks(story.id));
  return {
    processed: results.length,
    completed: results.filter((item) => item.status === 'completed').length,
    failed: results.filter((item) => item.status === 'failed').length,
    proposed: results.reduce((sum, item) => sum + item.proposedCount, 0),
    accepted: results.reduce((sum, item) => sum + item.acceptedCount, 0),
    rejected: results.reduce((sum, item) => sum + item.rejectedCount, 0),
    estimatedCostUsd: results.reduce((sum, item) => sum + item.estimatedCostUsd, 0),
    remaining: Math.max(0, candidates.length - selected.length),
    results,
  };
}

export async function getContextualLinkStatus() {
  const supabase = getSupabaseAdminClient();
  const [{ data: stories, error: storiesError }, { data: assessments, error: assessmentsError }] = await Promise.all([
    supabase.from('stories').select('id').in('content_type', ['news', 'daily_digest', 'weekly_digest']).in('status', ['draft', 'published']),
    supabase.from('story_linking_assessments').select('story_id, prompt_version, status, link_count'),
  ]);
  if (storiesError) throw storiesError;
  if (assessmentsError) throw assessmentsError;
  const eligibleIds = new Set((stories ?? []).map((story) => story.id));
  const current = (assessments ?? []).filter((assessment) => eligibleIds.has(assessment.story_id) && assessment.prompt_version === CONTEXTUAL_LINK_PROMPT_VERSION);
  const completed = current.filter((assessment) => assessment.status === 'completed');
  return {
    total: eligibleIds.size,
    current: completed.length,
    failed: current.filter((assessment) => assessment.status === 'failed').length,
    remaining: Math.max(0, eligibleIds.size - current.length),
    acceptedLinks: completed.reduce((sum, assessment) => sum + Number(assessment.link_count ?? 0), 0),
  };
}
