import { assessUnprocessedItems } from '@/lib/openai/assess-news';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  try {
    return Response.json(await assessUnprocessedItems());
  } catch (error) {
    console.error('AI assessment failed', error);
    return Response.json({ error: 'The AI assessment could not be completed.' }, { status: 500 });
  }
}
