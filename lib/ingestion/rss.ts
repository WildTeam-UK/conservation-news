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

type SourceTask = {
  task_id: string;
  task_lease_token: string;
  source_id: string;
  source_name: string;
  feed_url: string;
  source_kind: SourceRecord['source_kind'];
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

type CollectionStatus = 'queued' | 'collecting' | 'completed' | 'partial' | 'failed';

export type CollectionResult = {
  runId: string;
  status: CollectionStatus;
  sourcesChecked: number;
  itemsFound: number;
  itemsNew: number;
  remainingSources: number;
  errors: string[];
};

type CollectionSettings = {
  collection_batch_size: number;
  collection_concurrency: number;
};

type RunSummary = {
  run_status: CollectionStatus;
  sources_checked: number;
  items_found: number;
  items_new: number;
  remaining_sources: number;
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

  let itemsAdded = 0;
  if (newItems.length) {
    const { data: inserted, error } = await supabase.from('source_items').upsert(
      newItems.map((item) => ({
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
      })),
      { onConflict: 'url', ignoreDuplicates: true },
    ).select('id');
    if (error) throw error;
    itemsAdded = inserted?.length ?? 0;
  }

  return { found: items.length, added: itemsAdded };
}

async function activeCollectionRunId() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('id')
    .in('status', ['queued', 'collecting'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id as string | undefined;
}

async function startCollectionRun(runType: 'manual' | 'scheduled') {
  const supabase = getSupabaseAdminClient();
  const activeRunId = await activeCollectionRunId();
  if (activeRunId) return activeRunId;

  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('id')
    .eq('enabled', true)
    .order('name');
  if (sourcesError) throw sourcesError;

  const { data: run, error: runError } = await supabase
    .from('ingestion_runs')
    .insert({ run_type: runType, status: 'queued' })
    .select('id')
    .single();

  if (runError?.code === '23505') {
    const racedRunId = await activeCollectionRunId();
    if (racedRunId) return racedRunId;
  }
  if (runError || !run) throw runError ?? new Error('Could not create ingestion run.');

  const tasks = (sources ?? []).map((source) => ({ run_id: run.id, source_id: source.id }));
  if (tasks.length) {
    const { error: taskError } = await supabase.from('ingestion_run_sources').insert(tasks);
    if (taskError) {
      await supabase.from('ingestion_runs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_summary: errorMessage(taskError).slice(0, 2000),
      }).eq('id', run.id);
      throw taskError;
    }
  }

  return run.id as string;
}

async function collectionSettings(): Promise<CollectionSettings> {
  const { data, error } = await getSupabaseAdminClient()
    .from('editorial_run_settings')
    .select('collection_batch_size, collection_concurrency')
    .eq('id', true)
    .single();
  if (error) throw error;
  return {
    collection_batch_size: Math.max(1, Math.min(25, Number(data.collection_batch_size ?? 10))),
    collection_concurrency: Math.max(1, Math.min(10, Number(data.collection_concurrency ?? 5))),
  };
}

async function runWithConcurrency<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await work(item);
    }
  });
  await Promise.all(workers);
}

async function processSourceTask(task: SourceTask, runId: string) {
  const supabase = getSupabaseAdminClient();
  const source: SourceRecord = {
    id: task.source_id,
    name: task.source_name,
    feed_url: task.feed_url,
    source_kind: task.source_kind,
  };
  const completedAt = new Date().toISOString();
  try {
    const result = await collectSource(source, runId);
    const { error: taskError } = await supabase.from('ingestion_run_sources').update({
      status: 'completed',
      completed_at: completedAt,
      lease_token: null,
      lease_until: null,
      items_found: result.found,
      items_new: result.added,
      error_summary: null,
    }).eq('id', task.task_id).eq('lease_token', task.task_lease_token);
    if (taskError) throw taskError;

    await supabase.from('sources').update({
      last_checked_at: completedAt,
      last_success_at: completedAt,
      last_error: null,
    }).eq('id', source.id);
  } catch (error) {
    const detail = errorMessage(error);
    await Promise.all([
      supabase.from('ingestion_run_sources').update({
        status: 'failed',
        completed_at: completedAt,
        lease_token: null,
        lease_until: null,
        error_summary: detail.slice(0, 500),
      }).eq('id', task.task_id).eq('lease_token', task.task_lease_token),
      supabase.from('sources').update({
        last_checked_at: completedAt,
        last_error: detail.slice(0, 500),
      }).eq('id', source.id),
    ]);
  }
}

async function refreshCollectionRun(runId: string): Promise<CollectionResult> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc('refresh_ingestion_run', { target_run_id: runId });
  if (error) throw error;
  const summary = (Array.isArray(data) ? data[0] : data) as RunSummary | null;
  if (!summary) throw new Error('Collection run summary was not returned.');

  const { data: failures, error: failuresError } = await supabase
    .from('ingestion_run_sources')
    .select('error_summary, sources(name)')
    .eq('run_id', runId)
    .eq('status', 'failed')
    .order('completed_at');
  if (failuresError) throw failuresError;

  const errors = (failures ?? []).flatMap((failure) => {
    if (!failure.error_summary) return [];
    const relation = Array.isArray(failure.sources) ? failure.sources[0] : failure.sources;
    return [`${relation?.name ?? 'Source'}: ${failure.error_summary}`];
  });

  return {
    runId,
    status: summary.run_status,
    sourcesChecked: summary.sources_checked,
    itemsFound: summary.items_found,
    itemsNew: summary.items_new,
    remainingSources: summary.remaining_sources,
    errors,
  };
}

export async function advanceCollectionRun(runId: string): Promise<CollectionResult> {
  const supabase = getSupabaseAdminClient();
  const settings = await collectionSettings();
  const { data, error } = await supabase.rpc('claim_ingestion_source_batch', {
    target_run_id: runId,
    batch_size: settings.collection_batch_size,
    lease_seconds: 90,
  });
  if (error) throw error;

  const tasks = (data ?? []) as SourceTask[];
  await runWithConcurrency(tasks, settings.collection_concurrency, (task) => processSourceTask(task, runId));
  return refreshCollectionRun(runId);
}

export async function continueActiveCollection(): Promise<CollectionResult | null> {
  const runId = await activeCollectionRunId();
  return runId ? advanceCollectionRun(runId) : null;
}

export async function collectEnabledSources(
  runType: 'manual' | 'scheduled' = 'manual',
  existingRunId?: string | null,
): Promise<CollectionResult> {
  const runId = existingRunId ?? await startCollectionRun(runType);
  return advanceCollectionRun(runId);
}
