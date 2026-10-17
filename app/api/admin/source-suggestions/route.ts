import { rebuildSourceSuggestionsFromResearch, scanBestSourceSuggestions } from '@/lib/source-discovery';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return Boolean(admin);
}

export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  try {
    const rebuilt = await rebuildSourceSuggestionsFromResearch();
    const scanned = await scanBestSourceSuggestions(8);
    return Response.json({ ...rebuilt, ...scanned });
  } catch (error) {
    console.error('Source recommendation refresh failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Source recommendations could not be refreshed.' }, { status: 500 });
  }
}
