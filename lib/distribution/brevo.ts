import { positiveIntegerEnvironmentValue, requireEnvironmentValue } from '@/lib/environment';
import { DistributionProviderError } from './errors';

export type BrevoCampaignPayload = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  listId: number;
  tag: string;
};

function configuration() {
  return {
    apiKey: requireEnvironmentValue('BREVO_API_KEY', process.env.BREVO_API_KEY),
    senderId: positiveIntegerEnvironmentValue('BREVO_SENDER_ID', process.env.BREVO_SENDER_ID),
  };
}

async function brevoRequest(path: string, init: RequestInit, outcomeIfUnconfirmed: 'retryable' | 'uncertain' = 'uncertain') {
  const { apiKey } = configuration();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('api-key', apiKey);
  headers.set('content-type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`https://api.brevo.com/v3${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new DistributionProviderError(error instanceof Error ? `Brevo did not confirm the request: ${error.message}` : 'Brevo did not confirm the request.', outcomeIfUnconfirmed);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = `Brevo rejected the campaign request (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ''}`;
    if (response.status === 429) throw new DistributionProviderError(message, 'retryable');
    if (response.status >= 500) throw new DistributionProviderError(message, outcomeIfUnconfirmed);
    throw new DistributionProviderError(message, 'rejected');
  }
  return response;
}

export async function createBrevoCampaign(payload: BrevoCampaignPayload) {
  const { senderId } = configuration();
  const response = await brevoRequest('/emailCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      sender: { id: senderId },
      recipients: { listIds: [payload.listId] },
      subject: payload.subject,
      previewText: payload.previewText,
      htmlContent: payload.htmlContent,
      tag: payload.tag,
      mirrorActive: false,
      utmSource: 'wildnews',
      utmMedium: 'email',
      utmCampaign: payload.tag.replace(/[^a-zA-Z0-9 ]/g, ' ').slice(0, 100),
    }),
  });
  const result = await response.json().catch(() => ({})) as { id?: number };
  if (!Number.isSafeInteger(result.id) || Number(result.id) < 1) throw new DistributionProviderError('Brevo created no identifiable campaign, so the outcome could not be confirmed.', 'uncertain');
  return String(result.id);
}

export async function createBrevoTestCampaign(payload: BrevoCampaignPayload) {
  const { senderId } = configuration();
  const response = await brevoRequest('/emailCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: `[TEST] ${payload.name}`,
      sender: { id: senderId },
      subject: payload.subject,
      previewText: payload.previewText,
      htmlContent: payload.htmlContent,
      tag: payload.tag,
      mirrorActive: false,
      utmSource: 'wildnews',
      utmMedium: 'email',
      utmCampaign: payload.tag.replace(/[^a-zA-Z0-9 ]/g, ' ').slice(0, 100),
    }),
  });
  const result = await response.json().catch(() => ({})) as { id?: number };
  if (!Number.isSafeInteger(result.id) || Number(result.id) < 1) throw new DistributionProviderError('Brevo created no identifiable test campaign, so the outcome could not be confirmed.', 'uncertain');
  return String(result.id);
}

export async function sendBrevoCampaignTest(campaignId: string, email: string) {
  await brevoRequest(`/emailCampaigns/${encodeURIComponent(campaignId)}/sendTest`, {
    method: 'POST',
    body: JSON.stringify({ emailTo: [email] }),
  });
}

export async function deleteBrevoCampaign(campaignId: string) {
  await brevoRequest(`/emailCampaigns/${encodeURIComponent(campaignId)}`, { method: 'DELETE' }, 'retryable');
}

export async function sendBrevoCampaign(campaignId: string) {
  await brevoRequest(`/emailCampaigns/${encodeURIComponent(campaignId)}/sendNow`, { method: 'POST', body: '{}' });
}

export async function brevoCampaignIsSubmitted(campaignId: string) {
  const response = await brevoRequest(`/emailCampaigns/${encodeURIComponent(campaignId)}?excludeHtmlContent=true`, { method: 'GET' }, 'retryable');
  const result = await response.json().catch(() => ({})) as { status?: string };
  return ['queued', 'scheduled', 'sending', 'sent'].includes(result.status ?? '');
}

