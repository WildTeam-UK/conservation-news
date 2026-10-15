import { searchUnsplashImages, unsplashIsConfigured } from '@/lib/images/unsplash';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  if (!unsplashIsConfigured()) return Response.json({ error: 'Unsplash has not been connected yet.' }, { status: 503 });
  const query = new URL(request.url).searchParams.get('query')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) return Response.json({ error: 'Enter an image search between 2 and 120 characters.' }, { status: 400 });
  try {
    return Response.json({ images: await searchUnsplashImages(query, 6) });
  } catch (error) {
    console.error('Unsplash image search failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Image search failed.' }, { status: 502 });
  }
}
