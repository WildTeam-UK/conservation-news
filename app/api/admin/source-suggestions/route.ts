import { enrichSourceSuggestionDescriptions, rebuildSourceSuggestionsFromResearch, scanBestSourceSuggestions } from '@/lib/source-discovery';
import { unexpectedErrorResponse } from '@/lib/api-errors';
import { refreshSourceIntelligence } from '@/lib/source-intelligence';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const rebuilt = await rebuildSourceSuggestionsFromResearch();
    const enriched = await enrichSourceSuggestionDescriptions();
    const scanned = await scanBestSourceSuggestions(8);
    const intelligence = await refreshSourceIntelligence();
    return Response.json({ ...rebuilt, ...enriched, ...scanned, ...intelligence });
  } catch (error) {
    return unexpectedErrorResponse('Source recommendation refresh failed', error, 'Source recommendations could not be refreshed.');
  }
}
