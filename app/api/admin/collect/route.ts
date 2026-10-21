import { collectEnabledSources } from '@/lib/ingestion/rss';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  try {
    const result = await collectEnabledSources('manual');
    return Response.json(result, { status: result.status === 'failed' ? 502 : 200 });
  } catch (error) {
    console.error('Collection run failed before completion', error);
    return Response.json({ error: 'The collection run could not be started.' }, { status: 500 });
  }
}
