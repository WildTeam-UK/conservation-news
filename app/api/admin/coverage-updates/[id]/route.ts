import { unexpectedErrorResponse } from '@/lib/api-errors';
import { prepareCoverageUpdate } from '@/lib/coverage-revision-workflow';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type CoverageDecision = 'dismiss' | 'no_change' | 'prepare_revision';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid coverage update is required.' }, { status: 400 });

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json().catch(() => null) as { decision?: CoverageDecision } | null;
  if (!body?.decision || !['dismiss', 'no_change', 'prepare_revision'].includes(body.decision)) {
    return Response.json({ error: 'Choose a valid coverage decision.' }, { status: 400 });
  }

  try {
    const { data: update, error: updateError } = await supabase
      .from('story_cluster_updates')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (updateError) throw updateError;
    if (!update) return Response.json({ error: 'Coverage update not found.' }, { status: 404 });
    if (update.status !== 'pending_review') return Response.json({ error: 'This coverage update has already been reviewed.' }, { status: 409 });

    if (body.decision !== 'prepare_revision') {
      const status = body.decision === 'dismiss' ? 'dismissed' : 'no_change';
      const { error } = await supabase.from('story_cluster_updates').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id).eq('status', 'pending_review');
      if (error) throw error;
      return Response.json({ reviewed: true, status });
    }

    return Response.json(await prepareCoverageUpdate({ supabase, updateId: id, actorId: user.id }));
  } catch (error) {
    return unexpectedErrorResponse('Coverage update decision failed', error, 'The coverage decision could not be saved.');
  }
}
