import { getGoodNewsStatus } from '@/lib/good-news-status';
import { clampScore } from '@/lib/scores';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase } = auth;
  const body = await request.json() as { minimumScore?: number; minimumConfidence?: number };
  const minimumScore = clampScore(body.minimumScore);
  const minimumConfidence = clampScore(body.minimumConfidence);
  const { error } = await supabase.from('good_news_settings').update({ minimum_score: minimumScore, minimum_confidence: minimumConfidence }).eq('id', true);
  if (error) return Response.json({ error: 'Good News settings could not be saved.' }, { status: 500 });
  return Response.json({ saved: true, status: await getGoodNewsStatus() });
}
