import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { safePublicHttpUrl } from '@/lib/urls';

type SourceRecord = {
  id: string;
  name: string;
  feed_url: string;
  source_kind: 'rss' | 'api' | 'website';
};

type FeedItem = {
  externalId: string | null;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  rawContent: string | null;
  contentHash: string;
};

type CollectionResult = {
  runId: string;
  status: 'completed' | 'partial' | 'failed';
  sourcesChecked: number;
  itemsFound: number;
  itemsNew: number;
  errors: string[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
});

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const textValue = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim() || null;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record['#text'] ?? record.href ?? record.__cdata);
  }
  return null;
};

const plainText = (value: string | null) => value
  ?.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim() || null;

const isoDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function assertSafeFeedUrl(value: string) {
  const url = safePublicHttpUrl(value);
  if (!url) throw new Error('Source URL is not permitted.');
  return url;
}

function parseFeed(xml: string): FeedItem[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
    feed?: { entry?: unknown };
  };
  const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
  const rawItems = asArray<unknown>(parsed.rss?.channel?.item ?? parsed.feed?.entry).filter(isRecord);

  const items = rawItems.slice(0, 50).flatMap((item): FeedItem[] => {
    const linkCandidates = asArray(item.link);
    const url = linkCandidates
      .map((link) => textValue(link))
      .find((link): link is string => Boolean(link));
    const title = plainText(textValue(item.title));

    if (!url || !title) return [];

    const rawContent = textValue(item.encoded ?? item.content ?? item.description ?? item.summary);
    const summary = plainText(textValue(item.description ?? item.summary ?? item.content));
    const externalId = textValue(item.guid ?? item.id);
    const authorRecord = isRecord(item.author) ? item.author : null;
    const author = plainText(textValue(item.creator ?? authorRecord?.name ?? item.author));
    const publishedAt = isoDate(textValue(item.pubDate ?? item.published ?? item.updated));

    return [{
      externalId,
      url,
      title,
      summary,
      author,
      publishedAt,
      rawContent,
      contentHash: createHash('sha256').update(`${title}\n${rawContent ?? summary ?? ''}`).digest('hex'),
    }];
  });

  // Some publishers repeat the same article in more than one RSS category. A
  // repeated GUID can also arrive with two slightly different URLs. Keep only
  // the first occurrence of either identifier so one noisy feed cannot make
  // the database reject the source's entire collection batch.
  const seenUrls = new Set<string>();
  const seenExternalIds = new Set<string>();
  return items.filter((item) => {
    if (seenUrls.has(item.url) || (item.externalId && seenExternalIds.has(item.externalId))) return false;
    seenUrls.add(item.url);
    if (item.externalId) seenExternalIds.add(item.externalId);
    return true;
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const details = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
    if (details.length) return details.join(' · ');
  }

  return 'Unknown collection error.';
}

async function collectSource(source: SourceRecord, runId: string) {
  if (source.source_kind !== 'rss') {
    throw new Error(`${source.source_kind.toUpperCase()} collection is not implemented yet.`);
  }

  const url = assertSafeFeedUrl(source.feed_url);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'WildNews Feed Collector/1.0 (+https://news.wildteam.org.uk)' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);

  const xml = await response.text();
  if (xml.length > 5_000_000) throw new Error('Feed was larger than the permitted 5 MB.');

  const items = parseFeed(xml);
  const supabase = getSupabaseAdminClient();
  const urls = items.map((item) => item.url);
  const externalIds = items.flatMap((item) => item.externalId ? [item.externalId] : []);
  const [existingUrlResult, existingIdResult] = await Promise.all([
    urls.length
      ? supabase.from('source_items').select('url').in('url', urls)
      : Promise.resolve({ data: [], error: null }),
    externalIds.length
      ? supabase.from('source_items').select('external_id').eq('source_id', source.id).in('external_id', externalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (existingUrlResult.error) throw existingUrlResult.error;
  if (existingIdResult.error) throw existingIdResult.error;

  const existingUrls = new Set((existingUrlResult.data ?? []).map((item) => item.url));
  const existingExternalIds = new Set((existingIdResult.data ?? []).map((item) => item.external_id));
  const newItems = items.filter((item) =>
    !existingUrls.has(item.url) && (!item.externalId || !existingExternalIds.has(item.externalId))
  );

  if (newItems.length) {
    const { error } = await supabase.from('source_items').insert(newItems.map((item) => ({
      source_id: source.id,
      ingestion_run_id: runId,
      external_id: item.externalId,
      url: item.url,
      canonical_url: item.url,
      title: item.title,
      summary: item.summary,
      author: item.author,
      published_at: item.publishedAt,
      raw_content: item.rawContent,
      content_hash: item.contentHash,
      language_code: 'en',
    })));
    if (error) throw error;
  }

  return { found: items.length, added: newItems.length };
}

export async function collectEnabledSources(runType: 'manual' | 'scheduled' = 'manual'): Promise<CollectionResult> {
  const supabase = getSupabaseAdminClient();
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from('ingestion_runs')
    .insert({ run_type: runType, status: 'collecting', started_at: startedAt })
    .select('id')
    .single();

  if (runError || !run) throw runError ?? new Error('Could not create ingestion run.');

  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('id, name, feed_url, source_kind')
    .eq('enabled', true)
    .order('name');

  if (sourcesError) throw sourcesError;

  let itemsFound = 0;
  let itemsNew = 0;
  const errors: string[] = [];

  for (const source of (sources ?? []) as SourceRecord[]) {
    const checkedAt = new Date().toISOString();
    try {
      const result = await collectSource(source, run.id);
      itemsFound += result.found;
      itemsNew += result.added;
      await supabase.from('sources').update({
        last_checked_at: checkedAt,
        last_success_at: checkedAt,
        last_error: null,
      }).eq('id', source.id);
    } catch (error) {
      const detail = errorMessage(error);
      errors.push(`${source.name}: ${detail}`);
      await supabase.from('sources').update({
        last_checked_at: checkedAt,
        last_error: detail.slice(0, 500),
      }).eq('id', source.id);
    }
  }

  const sourceCount = sources?.length ?? 0;
  const status = errors.length === 0 ? 'completed' : errors.length === sourceCount ? 'failed' : 'partial';
  await supabase.from('ingestion_runs').update({
    status,
    completed_at: new Date().toISOString(),
    sources_checked: sourceCount,
    items_found: itemsFound,
    items_new: itemsNew,
    error_summary: errors.length ? errors.join('\n').slice(0, 2000) : null,
  }).eq('id', run.id);

  return { runId: run.id, status, sourcesChecked: sourceCount, itemsFound, itemsNew, errors };
}
