import { restoreDraftToQueue } from '@/lib/publication-queue';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null) as { storyId?: string } | null;
  if (!isUuid(body?.storyId)) return Response.json({ error: 'A valid draft is required.' }, { status: 400 });

  try {
    const queue = await restoreDraftToQueue(body.storyId);
    await supabase.from('editorial_actions').insert({ story_id: body.storyId, user_id: user.id, action: 'edited', notes: 'Draft added to the automatic publishing queue by an editor.' });
    return Response.json({ added: true, queue });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The draft could not be added to the publishing queue.';
    return Response.json({ error: detail }, { status: 409 });
  }
}
