import { queueReadyDrafts, rebalancePublicationQueue } from '@/lib/publication-queue';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isTime } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => null) as {
    autoPublishEnabled?: boolean;
    publishWindowStart?: string;
    publishWindowEnd?: string;
    maxAutoPublishesPerDay?: number;
    minOverallScore?: number;
    minEvidenceScore?: number;
  } | null;
  const start = body?.publishWindowStart?.slice(0, 5) ?? '';
  const end = body?.publishWindowEnd?.slice(0, 5) ?? '';
  const maximum = Number(body?.maxAutoPublishesPerDay);
  const minimumOverall = Number(body?.minOverallScore);
  const minimumEvidence = Number(body?.minEvidenceScore);

  if (typeof body?.autoPublishEnabled !== 'boolean' || !isTime(start) || !isTime(end) || end <= start) {
    return Response.json({ error: 'Choose valid publishing hours with the end later than the start.' }, { status: 400 });
  }
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 200) {
    return Response.json({ error: 'The daily publishing limit must be between 1 and 200.' }, { status: 400 });
  }
  if (!Number.isInteger(minimumOverall) || minimumOverall < 0 || minimumOverall > 100 || !Number.isInteger(minimumEvidence) || minimumEvidence < 0 || minimumEvidence > 100) {
    return Response.json({ error: 'Quality thresholds must be whole numbers between 0 and 100.' }, { status: 400 });
  }

  const { error } = await supabase.from('editorial_run_settings').update({
    auto_publish_enabled: body.autoPublishEnabled,
    publish_window_start: `${start}:00`,
    publish_window_end: `${end}:00`,
    max_auto_publishes_per_day: maximum,
    min_auto_publish_overall_score: minimumOverall,
    min_auto_publish_evidence_score: minimumEvidence,
    updated_by: user.id,
  }).eq('id', true);
  if (error) {
    console.error('Publication settings save failed', error);
    return Response.json({ error: 'Publication settings could not be saved.' }, { status: 500 });
  }

  try {
    const queue = body.autoPublishEnabled ? await queueReadyDrafts(null) : await rebalancePublicationQueue();
    return Response.json({ saved: true, queue });
  } catch (error) {
    console.error('Publication queue refresh failed after saving settings', error);
    return Response.json({ saved: true, warning: 'Settings were saved, but the queue could not be refreshed.' });
  }
}
