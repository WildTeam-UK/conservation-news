import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid topic is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
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
