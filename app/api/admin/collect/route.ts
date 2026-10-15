import { collectEnabledSources } from '@/lib/ingestion/rss';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  try {
    const result = await collectEnabledSources('manual');
    return Response.json(result, { status: result.status === 'failed' ? 502 : 200 });
  } catch (error) {
    console.error('Collection run failed before completion', error);
    return Response.json({ error: 'The collection run could not be started.' }, { status: 500 });
  }
}
