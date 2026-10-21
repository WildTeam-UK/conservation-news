import { discoverSuggestionFeed } from '@/lib/source-discovery';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid source suggestion is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body?.action) return Response.json({ error: 'Choose a source action.' }, { status: 400 });
  const supabase = getSupabaseAdminClient();

  try {
    if (body.action === 'find_feed') return Response.json(await discoverSuggestionFeed(id));
    if (body.action === 'dismiss') {
      const { error } = await supabase.from('source_suggestions').update({ status: 'dismissed' }).eq('id', id);
      if (error) throw error;
      return Response.json({ saved: true });
    }
    if (body.action === 'add') {
      const { data: suggestion, error: suggestionError } = await supabase.from('source_suggestions').select('name, homepage_url, feed_url, feed_status').eq('id', id).eq('status', 'suggested').single();
      if (suggestionError || !suggestion) return Response.json({ error: 'Source suggestion not found.' }, { status: 404 });
      if (suggestion.feed_status !== 'found' || !suggestion.feed_url) return Response.json({ error: 'Find and validate an RSS feed before adding this source.' }, { status: 409 });
      const { error: insertError } = await supabase.from('sources').insert({
        name: suggestion.name,
        homepage_url: suggestion.homepage_url,
        feed_url: suggestion.feed_url,
        source_kind: 'rss',
        trust_status: 'provisional',
        enabled: true,
      });
      if (insertError) throw insertError;
      const { error: updateError } = await supabase.from('source_suggestions').update({ status: 'added' }).eq('id', id);
      if (updateError) throw updateError;
      return Response.json({ saved: true });
    }
    return Response.json({ error: 'Unknown source action.' }, { status: 400 });
  } catch (error) {
    console.error('Source suggestion update failed', error);
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    return Response.json({ error: code === '23505' ? 'That feed has already been added.' : 'The source suggestion could not be updated.' }, { status: 500 });
  }
}
