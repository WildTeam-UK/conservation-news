export const CONTENT_INTERACTION_TYPES = [
  'view',
  'usefulness_positive',
  'usefulness_negative',
  'share_linkedin',
  'share_facebook',
  'share_x',
  'copy_link',
  'outbound_source',
  'digest_story',
] as const;

export type ContentInteractionType = typeof CONTENT_INTERACTION_TYPES[number];

type ContentInteraction = {
  eventId?: string;
  storyId: string;
  eventType: ContentInteractionType;
  relatedStoryId?: string;
  storySourceId?: string;
};

const ANALYTICS_CONSENT_KEY = 'wildnews_analytics_consent';

export function interactionAnalyticsAllowed() {
  return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) !== 'denied';
}

export async function recordContentInteraction(interaction: ContentInteraction, explicit = false) {
  if (!explicit && !interactionAnalyticsAllowed()) return false;

  const response = await fetch('/api/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...interaction, eventId: interaction.eventId ?? crypto.randomUUID() }),
    keepalive: true,
  }).catch(() => null);

  return response?.ok ?? false;
}
