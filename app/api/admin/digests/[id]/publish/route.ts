import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DigestContent } from '@/lib/digests';

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

  const content = (story.generation_metadata as { digest_content?: DigestContent } | null)?.digest_content;
  if (!content) return Response.json({ error: 'The digest content could not be verified.' }, { status: 422 });

  const publishedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from('stories')
    .update({ status: 'published', published_at: publishedAt, reviewer_id: user.id })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (updateError || !updated) return Response.json({ error: 'The digest could not be published.' }, { status: 500 });

  const { data: run } = await supabase.from('digest_runs').select('id').eq('story_id', id).maybeSingle();
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
