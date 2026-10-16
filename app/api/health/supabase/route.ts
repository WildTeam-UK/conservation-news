import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';

export async function GET() {
  try {
    const { url, publishableKey } = getPublicSupabaseConfig();
    const supabase = createClient(url, publishableKey, {
      auth: { persistSession: false },
    });
    const { count, error } = await supabase
      .from('topics')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return Response.json({ ok: true, topics: count ?? 0 });
  } catch (error) {
    console.error('Supabase health check failed');
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      { status: 503 },
    );
  }
}

