import { reconcileExistingTaxonomy } from '@/lib/taxonomy-reconciliation';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { queueReadyDrafts } from '@/lib/publication-queue';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;

  try {
    const result = await reconcileExistingTaxonomy();
    if (result.processed) await queueReadyDrafts(null, null, true);
    return Response.json(result);
  } catch (error) {
    console.error('Taxonomy reconciliation failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Existing articles could not be reconciled.' }, { status: 500 });
  }
}
