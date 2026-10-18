import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hydrateDigestSourceStories, type DigestContent, type DigestSourceStory } from '@/lib/digests';
import { EDITORIAL_TOPICS, normalizeEditorialTopics } from '@/lib/taxonomy';

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
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid digest is required.' }, { status: 400 });
  const user = await adminUser();
  if (!user) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const supabase = getSupabaseAdminClient();
  const { data: story, error: storyError } = await supabase.from('stories')
    .select('id, slug, status, content_type, generation_metadata')
    .eq('id', id)
    .in('content_type', ['daily_digest', 'weekly_digest'])
    .maybeSingle();
  if (storyError || !story) return Response.json({ error: 'Digest not found.' }, { status: 404 });
  if (story.status !== 'draft') return Response.json({ error: 'Only a private digest draft can be published.' }, { status: 409 });

  const metadata = (story.generation_metadata ?? {}) as Record<string, unknown> & { digest_content?: DigestContent };
  const content = metadata.digest_content;
  if (!content) return Response.json({ error: 'The digest content could not be verified.' }, { status: 422 });

  const { data: run } = await supabase.from('digest_runs').select('id').eq('story_id', id).maybeSingle();
  let topicNames: string[] = normalizeEditorialTopics(content.topics ?? []).slice(0, 3);
  if (!topicNames.length && run) {
    const { data: sourceLinks } = await supabase.from('digest_run_stories')
      .select('stories(story_topics(topics(name)))')
      .eq('run_id', run.id);
    const counts = new Map<string, number>();
    for (const link of (sourceLinks ?? []) as unknown as Array<{ stories: { story_topics?: Array<{ topics: { name: string } | { name: string }[] | null }> } | { story_topics?: Array<{ topics: { name: string } | { name: string }[] | null }> }[] | null }>) {
      const source = Array.isArray(link.stories) ? link.stories[0] : link.stories;
      for (const topicLink of source?.story_topics ?? []) {
        const names = Array.isArray(topicLink.topics) ? topicLink.topics.map((topic) => topic.name) : topicLink.topics?.name ? [topicLink.topics.name] : [];
        for (const name of normalizeEditorialTopics(names)) counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    topicNames = [...counts].sort((a, b) => b[1] - a[1] || EDITORIAL_TOPICS.indexOf(a[0] as typeof EDITORIAL_TOPICS[number]) - EDITORIAL_TOPICS.indexOf(b[0] as typeof EDITORIAL_TOPICS[number])).slice(0, 3).map(([name]) => name);
  }
  if (!topicNames.length) topicNames = ['Conservation Practice'];
  content.topics = topicNames;
  const hydratedSources = await hydrateDigestSourceStories((metadata.digest_source_stories ?? []) as DigestSourceStory[]);
  const leadImage = hydratedSources.find((source) => source.image_url);
  const { data: topicRows, error: topicError } = await supabase.from('topics').select('id, name').in('name', topicNames).eq('active', true);
  if (topicError || !topicRows?.length) return Response.json({ error: 'The digest topics could not be prepared.' }, { status: 500 });
  const byName = new Map(topicRows.map((topic) => [topic.name, topic]));
  const selectedTopics = topicNames.flatMap((name) => byName.get(name) ?? []);

  const { error: clearTopicsError } = await supabase.from('story_topics').delete().eq('story_id', id);
  if (clearTopicsError) return Response.json({ error: 'The digest topics could not be updated.' }, { status: 500 });
  const { error: linkTopicsError } = await supabase.from('story_topics').insert(selectedTopics.map((topic) => ({ story_id: id, topic_id: topic.id })));
  if (linkTopicsError) return Response.json({ error: 'The digest topics could not be linked.' }, { status: 500 });

  const publishedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from('stories')
    .update({ status: 'published', published_at: publishedAt, reviewer_id: user.id, primary_topic_id: selectedTopics[0].id, image_url: leadImage?.image_url ?? null, image_alt: leadImage?.image_alt ?? null, generation_metadata: { ...metadata, digest_content: content, digest_source_stories: hydratedSources } })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (updateError || !updated) return Response.json({ error: 'The digest could not be published.' }, { status: 500 });

  await supabase.from('editorial_actions').insert({ story_id: id, user_id: user.id, action: 'published', notes: 'Digest reviewed and published manually. Social and email distribution remained disabled.' });
  if (run) {
    await Promise.all([
      supabase.from('digest_runs').update({ status: 'published', completed_at: publishedAt }).eq('id', run.id),
      supabase.from('digest_run_events').insert({ run_id: run.id, stage: 'publishing', message: 'Digest published manually. External distribution remained disabled.' }),
    ]);
  }

  const type = story.content_type === 'weekly_digest' ? 'weekly' : 'daily';
  const date = story.slug.replace(`${type}-digest-`, '');
  return Response.json({ saved: true, publishedAt, publicPath: `/${type}-digest/${date}` });
}
