import { cleanDraftContent, type StoryDraftContent } from '@/lib/openai/draft-story';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid draft is required.' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const { data: story, error: storyError } = await supabase.from('stories').select('id, status, generation_metadata').eq('id', id).single();
  if (storyError || !story) return Response.json({ error: 'Draft not found.' }, { status: 404 });
  if (story.status !== 'draft') return Response.json({ error: 'Only private drafts can be edited here.' }, { status: 409 });

  const body = await request.json().catch(() => null) as { content?: StoryDraftContent } | null;
  if (!body?.content) return Response.json({ error: 'Draft content is required.' }, { status: 400 });
  const metadata = (story.generation_metadata ?? {}) as Record<string, unknown> & { source_ids?: { id?: string }[] };
  const validSourceIds = new Set((metadata.source_ids ?? []).flatMap((source) => source.id ? [source.id] : []));

  try {
    const content = cleanDraftContent(body.content, validSourceIds);
    const updatedMetadata = { ...metadata, article_content: content, last_edited_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from('stories').update({
      headline: content.headline,
      standfirst: content.standfirst,
      overview: content.story_at_a_glance.map((item) => item.text).join('\n\n'),
      body: [`Why this matters\n${content.why_it_matters.text}`, `What happens next\n${content.what_happens_next.text}`, `What we know\n${content.what_we_know.map((item) => item.text).join('\n')}`, `What we don't know\n${content.what_we_dont_know.map((item) => item.text).join('\n')}`].join('\n\n'),
      key_takeaways: content.key_takeaways,
      why_it_matters: content.why_it_matters.text,
      agreed_points: content.what_we_know,
      disputed_points: content.what_we_dont_know,
      open_questions: content.what_we_dont_know.map((item) => item.text),
      image_url: content.image_url || null,
      image_alt: content.image_alt || null,
      byline: content.byline,
      reviewer_id: user.id,
      generation_metadata: updatedMetadata,
    }).eq('id', id);
    if (updateError) throw updateError;
    await supabase.from('editorial_actions').insert({ story_id: id, user_id: user.id, action: 'edited', notes: 'Draft edited and saved in the editorial workspace.' });
    return Response.json({ saved: true });
  } catch (error) {
    console.error('Draft save failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'The draft could not be saved.' }, { status: 500 });
  }
}
