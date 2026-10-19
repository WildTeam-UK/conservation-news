import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { trainingCourseValues } from '@/lib/training-courses';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return Boolean(admin);
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Enter valid course details.' }, { status: 400 });
  try {
    const { error } = await getSupabaseAdminClient().from('training_courses').insert(trainingCourseValues(body));
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const message = error instanceof Error && !code ? error.message : code === '23505' ? 'That course title or URL is already in the catalogue.' : 'The course could not be added.';
    return Response.json({ error: message }, { status: code === '23505' ? 409 : 400 });
  }
}
