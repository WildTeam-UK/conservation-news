import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const HEARTBEAT_STALE_AFTER_MS = 10 * 60_000;

type AutomationSettings = {
  automation_enabled: boolean;
  auto_publish_enabled: boolean;
  last_automation_tick_at: string | null;
  last_automation_error: string | null;
  consecutive_automation_failures: number;
};

type DigestSettings = {
  automation_enabled: boolean;
  last_automation_tick_at: string | null;
  last_automation_error: string | null;
  consecutive_automation_failures: number;
};

function isStale(timestamp: string | null) {
  if (!timestamp) return true;
  const age = Date.now() - new Date(timestamp).getTime();
  return !Number.isFinite(age) || age > HEARTBEAT_STALE_AFTER_MS;
}

const responseHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const [editorialResult, digestResult] = await Promise.all([
      supabase.from('editorial_run_settings').select('automation_enabled, auto_publish_enabled, last_automation_tick_at, last_automation_error, consecutive_automation_failures').eq('id', true).single(),
      supabase.from('digest_settings').select('automation_enabled, last_automation_tick_at, last_automation_error, consecutive_automation_failures').eq('id', true).single(),
    ]);

    if (editorialResult.error || digestResult.error) throw editorialResult.error ?? digestResult.error;

    const editorial = editorialResult.data as AutomationSettings;
    const digest = digestResult.data as DigestSettings;
    const editorialEnabled = editorial.automation_enabled || editorial.auto_publish_enabled;
    const heartbeatRequired = editorialEnabled || digest.automation_enabled;
    const heartbeatStale = heartbeatRequired && (isStale(editorial.last_automation_tick_at) || isStale(digest.last_automation_tick_at));
    const editorialFailing = editorialEnabled && Boolean(editorial.last_automation_error || editorial.consecutive_automation_failures);
    const digestFailing = digest.automation_enabled && Boolean(digest.last_automation_error || digest.consecutive_automation_failures);
    const ok = !heartbeatStale && !editorialFailing && !digestFailing;

    return Response.json({
      ok,
      checks: {
        database: 'healthy',
        scheduler: heartbeatRequired ? heartbeatStale ? 'stale' : 'healthy' : 'idle',
        editorial: editorialEnabled ? editorialFailing ? 'failing' : 'healthy' : 'disabled',
        publishing: editorial.auto_publish_enabled ? 'healthy' : 'disabled',
        digests: digest.automation_enabled ? digestFailing ? 'failing' : 'healthy' : 'disabled',
      },
      checked_at: new Date().toISOString(),
    }, { status: ok ? 200 : 503, headers: responseHeaders });
  } catch (error) {
    console.error('System health check failed', error);
    return Response.json({
      ok: false,
      checks: { database: 'unavailable' },
      checked_at: new Date().toISOString(),
    }, { status: 503, headers: responseHeaders });
  }
}
