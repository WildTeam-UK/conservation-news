import { enrichSourceSuggestionDescriptions, rebuildSourceSuggestionsFromResearch, scanBestSourceSuggestions } from '@/lib/source-discovery';
import { unexpectedErrorResponse } from '@/lib/api-errors';
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
    return unexpectedErrorResponse('Source recommendation refresh failed', error, 'Source recommendations could not be refreshed.');
  }
}
