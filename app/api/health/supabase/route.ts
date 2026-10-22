import { getSupabasePublicClient } from '@/lib/supabase/public';

export async function GET() {
  try {
    const { count, error } = await getSupabasePublicClient()
      .from('topics')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return Response.json({ ok: true, topics: count ?? 0 });
  } catch (error) {
    console.error('Supabase health check failed', error);
    return Response.json(
      {
        ok: false,
        error: 'Database health check failed.',
      },
      { status: 503 },
    );
  }
}

