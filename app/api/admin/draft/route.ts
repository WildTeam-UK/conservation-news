import { generateStoryDraft } from '@/lib/openai/draft-story';
import { queueReadyDrafts } from '@/lib/publication-queue';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { clusterId?: string } | null;
  if (!body?.clusterId || !uuidPattern.test(body.clusterId)) return Response.json({ error: 'A valid candidate is required.' }, { status: 400 });

  try {
    const result = await generateStoryDraft(body.clusterId, user.id);
    try {
      const queue = await queueReadyDrafts(null, result.storyId, true);
      return Response.json({ ...result, queue });
    } catch (queueError) {
      const queueWarning = queueError instanceof Error ? queueError.message : 'The draft could not be added to the publishing queue.';
      return Response.json({ ...result, queueWarning });
    }
  } catch (error) {
    console.error('Story drafting failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'The article draft could not be created.' }, { status: 500 });
  }
}
