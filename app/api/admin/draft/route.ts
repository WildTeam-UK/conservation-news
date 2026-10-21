import { generateStoryDraft } from '@/lib/openai/draft-story';
import { queueReadyDrafts } from '@/lib/publication-queue';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user } = auth;

  const body = await request.json().catch(() => null) as { clusterId?: string } | null;
  if (!isUuid(body?.clusterId)) return Response.json({ error: 'A valid candidate is required.' }, { status: 400 });

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
