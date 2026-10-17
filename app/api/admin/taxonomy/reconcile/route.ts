import { reconcileExistingTaxonomy } from '@/lib/taxonomy-reconciliation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { queueReadyDrafts } from '@/lib/publication-queue';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });

  try {
    const result = await reconcileExistingTaxonomy();
    if (result.processed) await queueReadyDrafts(null, null, true);
    return Response.json(result);
  } catch (error) {
    console.error('Taxonomy reconciliation failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Existing articles could not be reconciled.' }, { status: 500 });
  }
}
