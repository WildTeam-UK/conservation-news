import { XMLParser } from 'fast-xml-parser';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ResearchSource } from '@/lib/openai/research-story';

type SourceType = ResearchSource['source_type'];
type ResearchPackRow = { cluster_id: string; content: { sources?: ResearchSource[] } | null };
type DiscoveryInput = { clusterId: string; sources: ResearchSource[] };

const sourceTypeScores: Record<SourceType, { quality: number; originality: number; monitoring: number }> = {
  primary: { quality: 94, originality: 98, monitoring: 38 },
  academic: { quality: 92, originality: 96, monitoring: 48 },
  government: { quality: 88, originality: 92, monitoring: 70 },
  organisation: { quality: 82, originality: 84, monitoring: 88 },
  news: { quality: 80, originality: 76, monitoring: 94 },
  other: { quality: 52, originality: 52, monitoring: 42 },
};

const commonSecondLevelSuffixes = new Set([
  'ac.uk', 'co.uk', 'gov.uk', 'org.uk',
  'com.im',
  'asn.au', 'com.au', 'edu.au', 'gov.au', 'net.au', 'org.au',
  'ac.nz', 'co.nz', 'govt.nz', 'org.nz',
  'co.za', 'gov.za', 'org.za',
]);

const canonicalSiteAliases = new Map([
  ['bbc.co.uk', 'bbc'],
  ['bbc.com', 'bbc'],
  ['bbc.com.im', 'bbc'],
  ['bbci.co.uk', 'bbc'],
]);

function isSyndicatedPublisher(name: string) {
  return /\b(republished|carried|syndicated)\s+by\b/i.test(name);
}

function safeWebUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const blocked = host === 'localhost' || host === '::1' || host.endsWith('.local') ||
      host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') ||
      host.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    return ['http:', 'https:'].includes(url.protocol) && !blocked ? url : null;
  } catch {
    return null;
  }
}

function siteDomain(hostname: string) {
  const parts = hostname.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parts.length <= 2) return canonicalSiteAliases.get(parts.join('.')) ?? parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  const siteKey = commonSecondLevelSuffixes.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
  return canonicalSiteAliases.get(siteKey) ?? siteKey;
}

function sourceSite(value: string) {
  const url = safeWebUrl(value);
  if (!url) return null;
  const domain = url.hostname.toLowerCase().replace(/^www\./, '');
  return { domain, siteKey: siteDomain(domain), homepageUrl: `${url.protocol}//${domain}/` };
}

function scoreFor(type: SourceType, mentionCount: number) {
  const base = sourceTypeScores[type];
  const repeatEvidence = Math.min(100, 45 + Math.max(0, mentionCount - 1) * 15);
  return {
    quality: base.quality,
    originality: base.originality,
    recommendation: Math.round(base.quality * 0.25 + base.originality * 0.2 + base.monitoring * 0.4 + repeatEvidence * 0.15),
  };
}

async function existingSourceDomains() {
  const { data, error } = await getSupabaseAdminClient().from('sources').select('homepage_url, feed_url');
  if (error) throw error;
  return new Set((data ?? []).flatMap((source) => [source.homepage_url, source.feed_url]).flatMap((value) => {
    if (!value) return [];
    const site = sourceSite(value);
    return site ? [site.siteKey] : [];
  }));
}

async function registerInputs(inputs: DiscoveryInput[]) {
  const supabase = getSupabaseAdminClient();
  const monitoredDomains = await existingSourceDomains();
  const bestByDomain = new Map<string, { domain: string; name: string; homepage_url: string; source_type: SourceType; quality_score: number; originality_score: number; last_reason: string; last_article_url: string; last_seen_at: string }>();
  const mentions: Array<{ domain: string; cluster_id: string; source_url: string; source_title: string; reason: string; source_type: SourceType }> = [];
  const now = new Date().toISOString();

  for (const input of inputs) {
    const seenInStory = new Set<string>();
    for (const source of input.sources) {
      const site = sourceSite(source.url);
      if (!site || isSyndicatedPublisher(source.publisher) || monitoredDomains.has(site.siteKey) || seenInStory.has(site.domain)) continue;
      seenInStory.add(site.domain);
      const scores = sourceTypeScores[source.source_type];
      const current = bestByDomain.get(site.domain);
      if (!current || scores.quality + scores.originality > current.quality_score + current.originality_score) {
        bestByDomain.set(site.domain, {
          domain: site.domain,
          name: source.publisher.trim() || site.domain,
          homepage_url: site.homepageUrl,
          source_type: source.source_type,
          quality_score: scores.quality,
          originality_score: scores.originality,
          last_reason: source.why_relevant.slice(0, 1000),
          last_article_url: source.url,
          last_seen_at: now,
        });
      }
      mentions.push({ domain: site.domain, cluster_id: input.clusterId, source_url: source.url, source_title: source.title, reason: source.why_relevant, source_type: source.source_type });
    }
  }

  const suggestions = [...bestByDomain.values()];
  if (!suggestions.length) return { suggestions: 0, mentions: 0 };
  const { error: suggestionError } = await supabase.from('source_suggestions').upsert(suggestions, { onConflict: 'domain' });
  if (suggestionError) throw suggestionError;
  const { data: stored, error: storedError } = await supabase.from('source_suggestions').select('id, domain, source_type').in('domain', suggestions.map((item) => item.domain));
  if (storedError) throw storedError;
  const suggestionByDomain = new Map((stored ?? []).map((item) => [item.domain, item]));
  const mentionRows = mentions.flatMap((mention) => {
    const suggestion = suggestionByDomain.get(mention.domain);
    return suggestion ? [{ suggestion_id: suggestion.id, cluster_id: mention.cluster_id, source_url: mention.source_url, source_title: mention.source_title, reason: mention.reason, source_type: mention.source_type }] : [];
  });
  if (mentionRows.length) {
    const { error: mentionError } = await supabase.from('source_suggestion_mentions').upsert(mentionRows, { onConflict: 'suggestion_id,cluster_id' });
    if (mentionError) throw mentionError;
  }

  const ids = (stored ?? []).map((item) => item.id);
  const { data: allMentions, error: countsError } = await supabase.from('source_suggestion_mentions').select('suggestion_id').in('suggestion_id', ids);
  if (countsError) throw countsError;
  const counts = new Map<string, number>();
  for (const mention of allMentions ?? []) counts.set(mention.suggestion_id, (counts.get(mention.suggestion_id) ?? 0) + 1);
  await Promise.all((stored ?? []).map((suggestion) => {
    const count = counts.get(suggestion.id) ?? 1;
    const score = scoreFor(suggestion.source_type as SourceType, count);
    return supabase.from('source_suggestions').update({ quality_score: score.quality, originality_score: score.originality, recommendation_score: score.recommendation }).eq('id', suggestion.id);
  }));
  const { data: staleSuggestions, error: staleError } = await supabase
    .from('source_suggestions')
    .select('id, homepage_url, name')
    .eq('status', 'suggested');
  if (staleError) throw staleError;
  const staleIds = (staleSuggestions ?? []).flatMap((suggestion) => {
    const site = sourceSite(suggestion.homepage_url);
    return !site || monitoredDomains.has(site.siteKey) || isSyndicatedPublisher(suggestion.name) ? [suggestion.id] : [];
  });
  if (staleIds.length) {
    const { error: pruneError } = await supabase.from('source_suggestions').delete().in('id', staleIds);
    if (pruneError) throw pruneError;
  }
  return { suggestions: suggestions.length, mentions: mentionRows.length };
}

export async function recordResearchSourceSuggestions(clusterId: string, sources: ResearchSource[]) {
  return registerInputs([{ clusterId, sources }]);
}

export async function rebuildSourceSuggestionsFromResearch() {
  const { data, error } = await getSupabaseAdminClient().from('research_packs').select('cluster_id, content').eq('status', 'completed').order('updated_at', { ascending: false }).limit(250);
  if (error) throw error;
  const inputs = ((data ?? []) as ResearchPackRow[]).flatMap((pack) => Array.isArray(pack.content?.sources) ? [{ clusterId: pack.cluster_id, sources: pack.content.sources }] : []);
  return registerInputs(inputs);
}

async function fetchPublic(urlValue: string, accept: string) {
  let url = safeWebUrl(urlValue);
  if (!url) throw new Error('The site URL is not permitted.');
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      headers: { Accept: accept, 'User-Agent': 'WildNews Source Discovery/1.0 (+https://conservation-news.vercel.app)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(7_000),
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    url = safeWebUrl(new URL(location, url).toString());
    if (!url) throw new Error('The site redirected to a URL that is not permitted.');
  }
  throw new Error('The site redirected too many times.');
}

function feedLinks(html: string, baseUrl: string) {
  const candidates: string[] = [];
  for (const link of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = link.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    const type = link.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    const href = link.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || !rel.includes('alternate') || !/(rss|atom|feed|xml)/.test(type)) continue;
    const resolved = safeWebUrl(new URL(href, baseUrl).toString());
    if (resolved) candidates.push(resolved.toString());
  }
  return candidates;
}

function looksLikeFeed(xml: string) {
  try {
    const parsed = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(xml) as {
      rss?: { channel?: { item?: unknown } };
      feed?: { entry?: unknown };
      RDF?: { item?: unknown };
    };
    return Boolean(parsed.rss?.channel?.item || parsed.feed?.entry || parsed.RDF?.item);
  } catch {
    return false;
  }
}

async function validFeed(url: string) {
  try {
    const response = await fetchPublic(url, 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.2');
    if (!response.ok) return false;
    const body = (await response.text()).slice(0, 2_000_000);
    return looksLikeFeed(body);
  } catch {
    return false;
  }
}

export async function discoverSuggestionFeed(id: string) {
  const supabase = getSupabaseAdminClient();
  const { data: suggestion, error } = await supabase.from('source_suggestions').select('id, homepage_url, last_article_url, feed_url').eq('id', id).single();
  if (error || !suggestion) throw error ?? new Error('Source suggestion not found.');
  await supabase.from('source_suggestions').update({ feed_status: 'checking', last_feed_check_at: new Date().toISOString() }).eq('id', id);

  try {
    const pages = [...new Set([suggestion.homepage_url, suggestion.last_article_url].filter(Boolean))] as string[];
    const discovered: string[] = [];
    for (const page of pages.slice(0, 2)) {
      try {
        const response = await fetchPublic(page, 'text/html, application/xhtml+xml;q=0.9, */*;q=0.2');
        if (!response.ok) continue;
        const html = (await response.text()).slice(0, 1_500_000);
        discovered.push(...feedLinks(html, response.url || page));
      } catch {
        // One page failing should not prevent testing conventional feed paths.
      }
    }
    const home = new URL(suggestion.homepage_url);
    const conventional = ['/feed', '/feed.xml', '/rss', '/rss.xml', '/atom.xml'].map((path) => new URL(path, home).toString());
    const candidates = [...new Set([suggestion.feed_url, ...discovered, ...conventional].filter(Boolean) as string[])].slice(0, 10);
    const results = await Promise.all(candidates.map(async (url) => ({ url, valid: await validFeed(url) })));
    const found = results.find((result) => result.valid)?.url ?? null;
    await supabase.from('source_suggestions').update({ feed_url: found, feed_status: found ? 'found' : 'not_found', last_feed_check_at: new Date().toISOString() }).eq('id', id);
    return { found: Boolean(found), feedUrl: found };
  } catch (feedError) {
    await supabase.from('source_suggestions').update({ feed_status: 'failed', last_feed_check_at: new Date().toISOString() }).eq('id', id);
    throw feedError;
  }
}

export async function scanBestSourceSuggestions(limit = 8) {
  const supabase = getSupabaseAdminClient();
  const [{ data: existingFeeds, error: existingError }, { data: unchecked, error: uncheckedError }] = await Promise.all([
    supabase.from('source_suggestions').select('id').eq('status', 'suggested').eq('feed_status', 'found').order('recommendation_score', { ascending: false }).limit(limit),
    supabase.from('source_suggestions').select('id').eq('status', 'suggested').in('feed_status', ['unchecked', 'failed']).order('recommendation_score', { ascending: false }).limit(limit),
  ]);
  if (existingError || uncheckedError) throw existingError ?? uncheckedError;
  const candidates = [...(existingFeeds ?? []), ...(unchecked ?? [])].filter((suggestion, index, all) => all.findIndex((item) => item.id === suggestion.id) === index).slice(0, limit);
  const results = await Promise.allSettled(candidates.map((suggestion) => discoverSuggestionFeed(suggestion.id)));
  return { checked: results.length, found: results.filter((result) => result.status === 'fulfilled' && result.value.found).length };
}
