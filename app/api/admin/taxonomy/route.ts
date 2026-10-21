import { runTaxonomyGovernance } from '@/lib/taxonomy-governance';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const result = await runTaxonomyGovernance({ force: true, maxEntities: 30 });
    return Response.json(result);
  } catch (error) {
    return unexpectedErrorResponse('Taxonomy governance failed', error, 'Taxonomy governance could not be completed.');
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as { automationEnabled?: boolean; minPublishedStories?: number } | null;
  if (!body) return Response.json({ error: 'Enter valid taxonomy settings.' }, { status: 400 });
  const minimum = Math.round(Number(body.minPublishedStories));
  if (!Number.isFinite(minimum) || minimum < 1 || minimum > 100) return Response.json({ error: 'The taxonomy threshold is outside the allowed range.' }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from('taxonomy_settings').update({ automation_enabled: Boolean(body.automationEnabled), min_published_stories: minimum }).eq('id', true);
  if (error) return Response.json({ error: 'Taxonomy settings could not be saved.' }, { status: 500 });
  return Response.json({ saved: true });
}
