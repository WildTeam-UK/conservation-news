import { unexpectedErrorResponse } from '@/lib/api-errors';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { TrainingCourseValidationError, trainingCourseValues } from '@/lib/training-courses';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: 'Enter valid course details.' }, { status: 400 });
  try {
    const { error } = await getSupabaseAdminClient().from('training_courses').insert(trainingCourseValues(body));
    if (error) throw error;
    return Response.json({ saved: true });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (error instanceof TrainingCourseValidationError) return Response.json({ error: error.message }, { status: 400 });
    if (code === '23505') return Response.json({ error: 'That course title or URL is already in the catalogue.' }, { status: 409 });
    return unexpectedErrorResponse('Training course creation failed', error, 'The course could not be added.');
  }
}
