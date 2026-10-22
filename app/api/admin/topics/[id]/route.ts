import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid topic is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as { description?: string; seoTitle?: string; metaDescription?: string } | null;
  if (!body) return Response.json({ error: 'Enter valid topic details.' }, { status: 400 });
  const description = body.description?.trim().slice(0, 500) ?? '';
  const seoTitle = body.seoTitle?.trim().slice(0, 120) ?? '';
  const metaDescription = body.metaDescription?.trim().slice(0, 200) ?? '';
  if (!description || !seoTitle || !metaDescription) return Response.json({ error: 'Complete all three topic fields.' }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from('topics').update({ description, seo_title: seoTitle, meta_description: metaDescription }).eq('id', id);
  if (error) return Response.json({ error: 'The topic could not be updated.' }, { status: 500 });
  return Response.json({ saved: true });
}
