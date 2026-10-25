import { requireEnvironmentValue } from '@/lib/environment';
import { DistributionProviderError } from './errors';

export type BufferPostPayload = {
  text: string;
  imageUrl: string | null;
  source: string;
  mode: 'addToQueue' | 'shareNow';
};

type BufferCreatePostResponse = {
  data?: {
    createPost?:
      | { post?: { id?: string } }
      | { message?: string };
  };
  errors?: Array<{ message?: string }>;
};

type BufferChannelResponse = {
  data?: {
    channel?: { service?: string };
  };
  errors?: Array<{ message?: string }>;
};

const channelServices = new Map<string, string>();

export function bufferChannelIds() {
  return [...new Set((process.env.BUFFER_CHANNEL_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))];
}

async function bufferChannelService(channelId: string, apiKey: string) {
  const cachedService = channelServices.get(channelId);
  if (cachedService) return cachedService;

  let response: Response;
  try {
    response = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query WildNewsBufferChannel($input: ChannelInput!) {
          channel(input: $input) { service }
        }`,
        variables: { input: { id: channelId } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new DistributionProviderError(error instanceof Error ? `Buffer could not check the destination channel: ${error.message}` : 'Buffer could not check the destination channel.', 'retryable');
  }

  const result = await response.json().catch(() => ({})) as BufferChannelResponse;
  const graphError = result.errors?.map((item) => item.message).filter(Boolean).join('; ');
  const service = result.data?.channel?.service?.toLowerCase();
  if (!response.ok || graphError || !service) {
    const detail = graphError ? ` ${graphError}` : '';
    const message = `Buffer could not identify the destination channel (${response.status}).${detail}`;
    if (response.status === 429 || response.status >= 500) throw new DistributionProviderError(message, 'retryable');
    throw new DistributionProviderError(message, 'rejected');
  }

  channelServices.set(channelId, service);
  return service;
}

export async function createBufferPost(channelId: string, payload: BufferPostPayload) {
  const apiKey = requireEnvironmentValue('BUFFER_API_KEY', process.env.BUFFER_API_KEY);
  const service = await bufferChannelService(channelId, apiKey);
  let response: Response;
  try {
    response = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation CreateWildNewsPost($input: CreatePostInput!) {
          createPost(input: $input) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }`,
        variables: {
          input: {
            channelId,
            text: payload.text,
            schedulingType: 'automatic',
            mode: payload.mode,
            source: payload.source,
            assets: payload.imageUrl ? [{ image: { url: payload.imageUrl } }] : [],
            ...(service === 'facebook' ? { metadata: { facebook: { type: 'post' } } } : {}),
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new DistributionProviderError(error instanceof Error ? `Buffer did not confirm the request: ${error.message}` : 'Buffer did not confirm the request.', 'uncertain');
  }

  const result = await response.json().catch(() => ({})) as BufferCreatePostResponse;
  const graphError = result.errors?.map((item) => item.message).filter(Boolean).join('; ');
  const mutation = result.data?.createPost;
  const mutationError = mutation && 'message' in mutation ? mutation.message : null;
  if (!response.ok || graphError || mutationError) {
    const message = `Buffer rejected the post (${response.status}).${graphError || mutationError ? ` ${graphError || mutationError}` : ''}`;
    if (response.status === 429) throw new DistributionProviderError(message, 'retryable');
    if (response.status >= 500) throw new DistributionProviderError(message, 'uncertain');
    throw new DistributionProviderError(message, 'rejected');
  }
  const postId = mutation && 'post' in mutation ? mutation.post?.id : null;
  if (!postId) throw new DistributionProviderError('Buffer returned no post identifier, so the outcome could not be confirmed.', 'uncertain');
  return postId;
}

