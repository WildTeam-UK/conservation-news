import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import type { EditorialImageCredit } from '@/lib/images/types';

export type DigestType = 'daily' | 'weekly';

export type DigestSection = {
  heading: string;
  paragraphs: string[];
  story_ids: string[];
};

export type DigestContent = {
  template_version: 1;
  digest_type: DigestType;
  edition_label: string;
  headline: string;
  standfirst: string;
  introduction: string[];
  sections: DigestSection[];
  what_to_watch: string[];
  closing_note: string;
  seo_title: string;
  seo_description: string;
};

export type DigestSourceStory = {
  id: string;
  slug: string;
  headline: string;
  standfirst: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit?: EditorialImageCredit | null;
  published_at: string;
};

export type DigestStoryRecord = {
  id: string;
  slug: string;
  status: string;
  content_type: 'daily_digest' | 'weekly_digest';
  headline: string;
  standfirst: string;
  image_url: string | null;
  image_alt: string | null;
  published_at: string | null;
  digest_period_start: string;
  digest_period_end: string;
  generation_metadata: { digest_content?: DigestContent; digest_source_stories?: DigestSourceStory[] };
};

function publicClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
}

export function digestPath(type: DigestType, date: string) {
  return `/${type === 'weekly' ? 'weekly-digest' : 'daily-digest'}/${date}`;
}

export async function getPublishedDigest(type: DigestType, date: string) {
  const { data, error } = await publicClient().from('stories')
    .select('id, slug, status, content_type, headline, standfirst, image_url, image_alt, published_at, digest_period_start, digest_period_end, generation_metadata')
    .eq('slug', `${type}-digest-${date}`)
    .eq('content_type', `${type}_digest`)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as DigestStoryRecord | null;
}

export async function getPublishedWeeklyDigests(limit = 52) {
  const { data, error } = await publicClient().from('stories')
    .select('id, slug, status, content_type, headline, standfirst, image_url, image_alt, published_at, digest_period_start, digest_period_end, generation_metadata')
    .eq('content_type', 'weekly_digest')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DigestStoryRecord[];
}

