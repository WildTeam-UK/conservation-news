import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { trainingCourseValues } from '@/lib/training-courses';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid course is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Enter valid course details.' }, { status: 400 });
  try {
    const values = body.action === 'toggle' ? { active: body.active === true } : trainingCourseValues(body);
    const { error } = await getSupabaseAdminClient().from('training_courses').update(values).eq('id', id);
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const message = error instanceof Error && !code ? error.message : code === '23505' ? 'That course title or URL is already in the catalogue.' : 'The course could not be saved.';
    return Response.json({ error: message }, { status: code === '23505' ? 409 : 400 });
  }
}
