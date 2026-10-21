import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoodNewsStatus } from '@/lib/good-news-status';
import { clampScore } from '@/lib/scores';

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json() as { minimumScore?: number; minimumConfidence?: number };
  const minimumScore = clampScore(body.minimumScore);
  const minimumConfidence = clampScore(body.minimumConfidence);
  const { error } = await supabase.from('good_news_settings').update({ minimum_score: minimumScore, minimum_confidence: minimumConfidence }).eq('id', true);
  if (error) return Response.json({ error: 'Good News settings could not be saved.' }, { status: 500 });
  return Response.json({ saved: true, status: await getGoodNewsStatus() });
}
