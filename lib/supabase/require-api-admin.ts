import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireApiAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: Response.json({ error: 'Authentication required.' }, { status: 401 }) } as const;

  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (!admin) return { response: Response.json({ error: 'Editorial access required.' }, { status: 403 }) } as const;

  return { supabase, user } as const;
}
