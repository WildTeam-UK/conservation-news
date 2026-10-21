import { enrichSourceSuggestionDescriptions, rebuildSourceSuggestionsFromResearch, scanBestSourceSuggestions } from '@/lib/source-discovery';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  try {
    const rebuilt = await rebuildSourceSuggestionsFromResearch();
    const enriched = await enrichSourceSuggestionDescriptions();
    const scanned = await scanBestSourceSuggestions(8);
    return Response.json({ ...rebuilt, ...enriched, ...scanned });
  } catch (error) {
    console.error('Source recommendation refresh failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Source recommendations could not be refreshed.' }, { status: 500 });
  }
}
