import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getGoodNewsStatus() {
  const supabase = getSupabaseAdminClient();
  const [{ data: stories, error: storiesError }, { data: outlooks, error: outlooksError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from('stories').select('id, status, generation_metadata').eq('content_type', 'news').in('status', ['draft', 'published']).limit(1000),
    supabase.from('story_conservation_outlooks').select('story_id, classification, score, confidence').limit(1000),
    supabase.from('good_news_settings').select('minimum_score, minimum_confidence').eq('id', true).single(),
  ]);
  if (storiesError || outlooksError || settingsError) throw storiesError ?? outlooksError ?? settingsError;

  const eligibleStories = (stories ?? []).filter((story) => Boolean((story.generation_metadata as Record<string, unknown> | null)?.article_content));
  const eligibleIds = new Set(eligibleStories.map((story) => story.id));
  const publishedIds = new Set(eligibleStories.filter((story) => story.status === 'published').map((story) => story.id));
  const assessed = (outlooks ?? []).filter((outlook) => eligibleIds.has(outlook.story_id));
  const qualifying = assessed.filter((outlook) => publishedIds.has(outlook.story_id) && outlook.classification === 'positive' && outlook.score >= settings.minimum_score && outlook.confidence >= settings.minimum_confidence).length;
  const classifications = { positive: 0, mixed: 0, neutral: 0, negative: 0 };
  for (const outlook of assessed) classifications[outlook.classification as keyof typeof classifications] += 1;

  return { total: eligibleIds.size, assessed: assessed.length, remaining: Math.max(0, eligibleIds.size - assessed.length), qualifying, classifications };
}
