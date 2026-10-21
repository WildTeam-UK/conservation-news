import { runTaxonomyGovernance } from '@/lib/taxonomy-governance';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  try {
    const result = await runTaxonomyGovernance({ force: true, maxEntities: 30 });
    return Response.json(result);
  } catch (error) {
    console.error('Taxonomy governance failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Taxonomy governance could not be completed.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { automationEnabled?: boolean; minPublishedStories?: number } | null;
  if (!body) return Response.json({ error: 'Enter valid taxonomy settings.' }, { status: 400 });
  const minimum = Math.round(Number(body.minPublishedStories));
  if (!Number.isFinite(minimum) || minimum < 1 || minimum > 100) return Response.json({ error: 'The taxonomy threshold is outside the allowed range.' }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from('taxonomy_settings').update({ automation_enabled: Boolean(body.automationEnabled), min_published_stories: minimum }).eq('id', true);
  if (error) return Response.json({ error: 'Taxonomy settings could not be saved.' }, { status: 500 });
  return Response.json({ saved: true });
}
