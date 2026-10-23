import { randomUUID } from 'node:crypto';
import { bufferChannelIds, createBufferPost, type BufferPostPayload } from '@/lib/distribution/buffer';
import { brevoCampaignIsSubmitted, createBrevoCampaign, sendBrevoCampaign, type BrevoCampaignPayload } from '@/lib/distribution/brevo';
import { buildEmailDistributionPayload, buildSocialDistributionPayload } from '@/lib/distribution/digest-content';
import { DistributionProviderError } from '@/lib/distribution/errors';
import type { DigestContent, DigestSourceStory, DigestType } from '@/lib/digests';
import { positiveIntegerEnvironmentValue } from '@/lib/environment';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type DeliveryProvider = 'buffer' | 'brevo';
type DeliveryStatus = 'pending' | 'processing' | 'submitted' | 'completed' | 'failed' | 'uncertain' | 'cancelled';

type DeliveryRecord = {
  id: string;
  run_id: string;
  story_id: string;
  provider: DeliveryProvider;
  destination: string;
  status: DeliveryStatus;
  payload: Record<string, unknown>;
  provider_reference: string | null;
  attempt_count: number;
  lease_token: string | null;
};

type DigestStory = {
  id: string;
  slug: string;
  status: string;
  content_type: 'daily_digest' | 'weekly_digest';
  image_url: string | null;
  image_alt: string | null;
  generation_metadata: {
    digest_content?: DigestContent;
    digest_source_stories?: DigestSourceStory[];
  };
};

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : 'The provider request failed.').replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

function editionDetails(story: DigestStory) {
  const type: DigestType = story.content_type === 'weekly_digest' ? 'weekly' : 'daily';
  return { type, editionDate: story.slug.replace(`${type}-digest-`, '') };
}

async function recordPreparationFailure(runId: string, storyId: string, provider: DeliveryProvider, message: string) {
  const supabase = getSupabaseAdminClient();
  await Promise.all([
    supabase.from('digest_runs').update({
      status: 'partial',
      ...(provider === 'buffer' ? { social_status: 'failed' } : { email_status: 'failed' }),
      error_summary: message.slice(0, 1000),
    }).eq('id', runId),
    supabase.from('digest_deliveries').upsert({ id: randomUUID(), run_id: runId, story_id: storyId, provider, destination: 'configuration', status: 'failed', payload: {}, last_error: message.slice(0, 1000), completed_at: new Date().toISOString() }, { onConflict: 'run_id,provider,destination', ignoreDuplicates: true }),
    supabase.from('digest_run_events').insert({ run_id: runId, stage: 'distribution', level: 'error', message: message.slice(0, 1000), details: { provider } }),
  ]);
}

export async function prepareDigestDistributions(runId: string, storyId: string) {
  const supabase = getSupabaseAdminClient();
  const [{ data: settings, error: settingsError }, { data: story, error: storyError }] = await Promise.all([
    supabase.from('digest_settings').select('social_distribution_enabled, social_distribution_mode, email_distribution_enabled').eq('id', true).single(),
    supabase.from('stories').select('id, slug, status, content_type, image_url, image_alt, generation_metadata').eq('id', storyId).single(),
  ]);
  if (settingsError || storyError || !settings || !story) throw settingsError ?? storyError ?? new Error('Digest distribution could not be prepared.');
  const digestStory = story as DigestStory;
  if (digestStory.status !== 'published') throw new Error('Only a published digest can be distributed.');
  const content = digestStory.generation_metadata.digest_content;
  if (!content) throw new Error('The published digest has no verified distribution content.');
  const { type, editionDate } = editionDetails(digestStory);
  const rows: Array<{ id: string; run_id: string; story_id: string; provider: DeliveryProvider; destination: string; payload: Record<string, unknown> }> = [];
  let socialCopy: Record<string, unknown> = {};
  let emailContent: Record<string, unknown> = {};
  let socialStatus = 'disabled';
  let emailStatus = 'disabled';

  if (settings.social_distribution_enabled) {
    const channels = bufferChannelIds();
    const bufferMode = settings.social_distribution_mode === 'immediate' ? 'shareNow' : 'addToQueue';
    if (!channels.length || !(process.env.BUFFER_API_KEY ?? '').trim()) {
      await recordPreparationFailure(runId, storyId, 'buffer', 'Social distribution is enabled, but BUFFER_API_KEY or BUFFER_CHANNEL_IDS is not configured.');
      socialStatus = 'failed';
    } else {
      for (const channelId of channels) {
        const id = randomUUID();
        const payload = buildSocialDistributionPayload({ deliveryId: id, type, editionDate, content, imageUrl: digestStory.image_url, mode: bufferMode });
        rows.push({ id, run_id: runId, story_id: storyId, provider: 'buffer', destination: channelId, payload });
      }
      socialCopy = { channel_ids: channels, mode: settings.social_distribution_mode, text: (rows.find((row) => row.provider === 'buffer')?.payload as unknown as BufferPostPayload | undefined)?.text ?? '', public_url: buildSocialDistributionPayload({ deliveryId: runId, type, editionDate, content, imageUrl: digestStory.image_url, mode: bufferMode }).publicUrl };
      socialStatus = 'pending';
    }
  }

  // The public signup promise is currently a Weekly Digest, so daily editions are not emailed.
  if (settings.email_distribution_enabled && type === 'weekly') {
    try {
      const listId = positiveIntegerEnvironmentValue('BREVO_LIST_ID', process.env.BREVO_LIST_ID);
      positiveIntegerEnvironmentValue('BREVO_SENDER_ID', process.env.BREVO_SENDER_ID);
      if (!(process.env.BREVO_API_KEY ?? '').trim()) throw new Error('BREVO_API_KEY is not configured.');
      const id = randomUUID();
      const payload = buildEmailDistributionPayload({ runId, type, editionDate, content, sources: digestStory.generation_metadata.digest_source_stories ?? [], imageUrl: digestStory.image_url, imageAlt: digestStory.image_alt, listId });
      rows.push({ id, run_id: runId, story_id: storyId, provider: 'brevo', destination: String(listId), payload });
      emailContent = { subject: payload.subject, preview_text: payload.previewText, public_url: payload.publicUrl };
      emailStatus = 'pending';
    } catch (error) {
      await recordPreparationFailure(runId, storyId, 'brevo', `Email distribution is enabled, but Brevo is not fully configured. ${safeError(error)}`);
      emailStatus = 'failed';
    }
  }

  if (rows.length) {
    const { error } = await supabase.from('digest_deliveries').upsert(rows, { onConflict: 'run_id,provider,destination', ignoreDuplicates: true });
    if (error) throw error;
  }
  const hasPending = socialStatus === 'pending' || emailStatus === 'pending';
  await supabase.from('digest_runs').update({
    status: hasPending ? 'distributing' : socialStatus === 'failed' || emailStatus === 'failed' ? 'partial' : 'published',
    social_status: socialStatus,
    email_status: emailStatus,
    social_copy: socialCopy,
    email_content: emailContent,
    completed_at: hasPending ? null : new Date().toISOString(),
  }).eq('id', runId);
  if (hasPending) await supabase.from('digest_run_events').insert({ run_id: runId, stage: 'distribution', message: `${rows.length} external ${rows.length === 1 ? 'delivery is' : 'deliveries are'} ready for the automation heartbeat.` });
  return { queued: rows.length, socialStatus, emailStatus };
}

export async function refreshDigestDistributionStatus(runId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('digest_deliveries').select('provider, status').eq('run_id', runId);
  if (error) throw error;
  const deliveries = (data ?? []) as Array<{ provider: DeliveryProvider; status: DeliveryStatus }>;
  const summarize = (provider: DeliveryProvider) => {
    const statuses = deliveries.filter((item) => item.provider === provider).map((item) => item.status);
    if (!statuses.length) return null;
    if (statuses.every((status) => status === 'cancelled')) return 'disabled';
    if (statuses.every((status) => status === 'submitted' || status === 'completed' || status === 'cancelled')) return provider === 'buffer' ? 'queued' : 'scheduled';
    if (statuses.some((status) => status === 'failed' || status === 'uncertain')) return provider === 'buffer' && statuses.some((status) => status === 'submitted' || status === 'completed') ? 'partial' : 'failed';
    return 'pending';
  };
  const socialStatus = summarize('buffer');
  const emailStatus = summarize('brevo');
  const hasOutstanding = deliveries.some((item) => item.status === 'pending' || item.status === 'processing');
  const hasProblem = deliveries.some((item) => item.status === 'failed' || item.status === 'uncertain');
  const update: Record<string, unknown> = {
    status: hasOutstanding ? 'distributing' : hasProblem ? 'partial' : deliveries.length ? 'completed' : 'published',
    completed_at: hasOutstanding ? null : new Date().toISOString(),
  };
  if (socialStatus) update.social_status = socialStatus;
  if (emailStatus) update.email_status = emailStatus;
  await supabase.from('digest_runs').update(update).eq('id', runId);
}

export async function processClaimedDigestDelivery(deliveryId: string, leaseToken: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('digest_deliveries').select('*').eq('id', deliveryId).eq('lease_token', leaseToken).eq('status', 'processing').maybeSingle();
  if (error || !data) throw error ?? new Error('The claimed digest delivery is no longer available.');
  const delivery = data as DeliveryRecord;
  try {
    let providerReference = delivery.provider_reference;
    if (delivery.provider === 'buffer') {
      if (!providerReference) {
        providerReference = await createBufferPost(delivery.destination, delivery.payload as unknown as BufferPostPayload);
        const { error: referenceError } = await supabase.from('digest_deliveries').update({ provider_reference: providerReference }).eq('id', delivery.id).eq('lease_token', leaseToken);
        if (referenceError) throw referenceError;
      }
    } else {
      const payload = delivery.payload as unknown as BrevoCampaignPayload;
      if (!providerReference) {
        providerReference = await createBrevoCampaign(payload);
        const { error: referenceError } = await supabase.from('digest_deliveries').update({ provider_reference: providerReference }).eq('id', delivery.id).eq('lease_token', leaseToken);
        if (referenceError) throw referenceError;
      }
      if (!await brevoCampaignIsSubmitted(providerReference)) await sendBrevoCampaign(providerReference);
    }
    const submittedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from('digest_deliveries').update({ status: 'submitted', provider_reference: providerReference, submitted_at: submittedAt, completed_at: submittedAt, lease_token: null, lease_expires_at: null, last_error: null }).eq('id', delivery.id).eq('lease_token', leaseToken);
    if (updateError) throw updateError;
    await supabase.from('digest_run_events').insert({ run_id: delivery.run_id, stage: 'distribution', message: `${delivery.provider === 'buffer' ? 'Buffer post queued' : 'Brevo campaign scheduled'} successfully.`, details: { provider: delivery.provider, destination: delivery.destination, provider_reference: providerReference } });
    await refreshDigestDistributionStatus(delivery.run_id);
    return { provider: delivery.provider, destination: delivery.destination, providerReference };
  } catch (error) {
    const providerError = error instanceof DistributionProviderError ? error : new DistributionProviderError(safeError(error), 'uncertain');
    const retryable = providerError.outcome === 'retryable' && delivery.attempt_count < 3;
    const status = retryable ? 'pending' : providerError.outcome === 'uncertain' ? 'uncertain' : 'failed';
    const nextAttemptAt = new Date(Date.now() + Math.min(30, 2 ** delivery.attempt_count) * 60_000).toISOString();
    await Promise.all([
      supabase.from('digest_deliveries').update({ status, next_attempt_at: nextAttemptAt, lease_token: null, lease_expires_at: null, last_error: safeError(providerError) }).eq('id', delivery.id).eq('lease_token', leaseToken),
      supabase.from('digest_run_events').insert({ run_id: delivery.run_id, stage: 'distribution', level: retryable ? 'warning' : 'error', message: safeError(providerError), details: { provider: delivery.provider, destination: delivery.destination, outcome: providerError.outcome } }),
    ]);
    await refreshDigestDistributionStatus(delivery.run_id);
    return { provider: delivery.provider, destination: delivery.destination, error: 'External delivery failed.', status };
  }
}

