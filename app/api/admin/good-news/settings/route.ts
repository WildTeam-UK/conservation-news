import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoodNewsBackfillStatus } from '@/lib/openai/backfill-conservation-outlooks';

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json() as { minimumScore?: number; minimumConfidence?: number };
  const minimumScore = Math.max(0, Math.min(100, Math.round(Number(body.minimumScore))));
  const minimumConfidence = Math.max(0, Math.min(100, Math.round(Number(body.minimumConfidence))));
  const { error } = await supabase.from('good_news_settings').update({ minimum_score: minimumScore, minimum_confidence: minimumConfidence }).eq('id', true);
  if (error) return Response.json({ error: 'Good News settings could not be saved.' }, { status: 500 });
  return Response.json({ saved: true, status: await getGoodNewsBackfillStatus() });
}
