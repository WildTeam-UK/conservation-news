import { searchUnsplashImages, unsplashIsConfigured } from '@/lib/images/unsplash';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
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
