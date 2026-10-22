import { assessUnprocessedItems } from '@/lib/openai/assess-news';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  try {
    return Response.json(await assessUnprocessedItems());
  } catch (error) {
    console.error('AI assessment failed', error);
    return Response.json({ error: 'The AI assessment could not be completed.' }, { status: 500 });
  }
}
