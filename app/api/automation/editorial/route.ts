import { timingSafeEqual } from 'node:crypto';
import { advanceEditorialRun } from '@/lib/editorial-runner';
import { collectEnabledSources } from '@/lib/ingestion/rss';
import { publishClaimedQueueItem } from '@/lib/publication-queue';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const expected = process.env.AUTOMATION_SECRET;
  const authorization = request.headers.get('authorization') ?? '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function recordHeartbeatSuccess() {
  await getSupabaseAdminClient().from('editorial_run_settings').update({
    last_automation_tick_at: new Date().toISOString(),
    last_automation_error: null,
    consecutive_automation_failures: 0,
  }).eq('id', true);
}

async function recordHeartbeatFailure(detail: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from('editorial_run_settings').select('consecutive_automation_failures').eq('id', true).maybeSingle();
  await supabase.from('editorial_run_settings').update({
    last_automation_tick_at: new Date().toISOString(),
    last_automation_error: detail.slice(0, 1000),
    consecutive_automation_failures: Number(data?.consecutive_automation_failures ?? 0) + 1,
  }).eq('id', true);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: 'Automation authorization failed.' }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  try {
    const { data: duePublication, error: publicationClaimError } = await supabase.rpc('claim_due_publication');
    if (publicationClaimError) throw publicationClaimError;
    const publication = duePublication ? await publishClaimedQueueItem(duePublication) : null;

    const { data, error } = await supabase.rpc('claim_due_editorial_run');
    if (error) throw error;
    const claim = Array.isArray(data) ? data[0] : null;

    if (claim?.claimed_run_id) {
      if (claim.newly_started) {
        await supabase.from('editorial_run_events').insert({
          run_id: claim.claimed_run_id,
          stage: 'run',
          level: 'info',
          message: 'Scheduled editorial run started automatically.',
          details: { trigger: 'supabase_cron' },
        });
      }
      const snapshot = await advanceEditorialRun(claim.claimed_run_id, null);
      await recordHeartbeatSuccess();
      return Response.json({ action: claim.newly_started ? 'started' : 'advanced', publication, snapshot });
    }

    const { data: collect, error: collectClaimError } = await supabase.rpc('claim_periodic_collection', { interval_hours: 2 });
    if (collectClaimError) throw collectClaimError;
    if (collect) {
      const result = await collectEnabledSources('scheduled');
      await recordHeartbeatSuccess();
      return Response.json({ action: 'collected', publication, result });
    }

    await recordHeartbeatSuccess();
    return Response.json({ action: publication ? 'published' : 'idle', publication });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown automation error.';
    await recordHeartbeatFailure(detail);
    console.error('Editorial automation heartbeat failed', error);
    return Response.json({ error: detail }, { status: 500 });
  }
}
