import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { StoryDraftContent } from '@/lib/openai/draft-story';
import { publicationChecks } from '@/lib/publishing';
import { runTaxonomyGovernance } from '@/lib/taxonomy-governance';

export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return admin ? user : null;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid draft is required.' }, { status: 400 });
  const user = await adminUser();
  if (!user) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const supabase = getSupabaseAdminClient();
  const [{ data: story, error: storyError }, { count: sourceCount, error: sourcesError }] = await Promise.all([
    supabase.from('stories').select('id, status, generation_metadata').eq('id', id).single(),
    supabase.from('story_sources').select('*', { count: 'exact', head: true }).eq('story_id', id),
  ]);
  if (storyError || !story) return Response.json({ error: 'Draft not found.' }, { status: 404 });
  if (sourcesError) return Response.json({ error: 'Sources could not be verified.' }, { status: 500 });
  if (story.status !== 'draft') return Response.json({ error: 'Only a draft can be published.' }, { status: 409 });
  const content = (story.generation_metadata as { article_content?: StoryDraftContent } | null)?.article_content;
  if (!content) return Response.json({ error: 'The article content could not be verified.' }, { status: 422 });
  const failed = publicationChecks(content, sourceCount ?? 0).filter((check) => !check.passed);
  if (failed.length) return Response.json({ error: `Complete these checks before publishing: ${failed.map((check) => check.label).join('; ')}.` }, { status: 422 });
  const publishedAt = new Date().toISOString();
  const { error: updateError } = await supabase.from('stories').update({ status: 'published', published_at: publishedAt, reviewer_id: user.id }).eq('id', id).eq('status', 'draft');
  if (updateError) return Response.json({ error: 'The article could not be published.' }, { status: 500 });
  await Promise.all([
    supabase.from('editorial_actions').insert({ story_id: id, user_id: user.id, action: 'published', notes: 'Article passed the publication checklist and was published.' }),
    supabase.from('publication_queue').update({ status: 'published', published_at: publishedAt, scheduled_for: publishedAt, claimed_at: null, hold_reason: null }).eq('story_id', id).in('status', ['queued', 'scheduled', 'publishing', 'held']),
  ]);
  try {
    await runTaxonomyGovernance({ includeTopics: false, maxEntities: 5 });
  } catch (error) {
    console.warn('Article published, but taxonomy governance could not be refreshed', error);
  }
  return Response.json({ saved: true, publishedAt });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid article is required.' }, { status: 400 });
  const user = await adminUser();
  if (!user) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('stories').update({ status: 'draft', published_at: null, reviewer_id: user.id }).eq('id', id).eq('status', 'published');
  if (error) return Response.json({ error: 'The article could not be unpublished.' }, { status: 500 });
  await Promise.all([
    supabase.from('editorial_actions').insert({ story_id: id, user_id: user.id, action: 'edited', notes: 'Article unpublished and returned to the private editorial workspace.' }),
    supabase.from('publication_queue').update({ status: 'cancelled', scheduled_for: null, claimed_at: null, hold_reason: 'Article was manually unpublished.' }).eq('story_id', id),
  ]);
  return Response.json({ saved: true });
}
