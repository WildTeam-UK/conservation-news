import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './server';

export async function requireContentAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: admin } = await supabase
    .from('admin_users')
    .select('display_name, email, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!admin) redirect('/admin/login?reason=not-authorised');

  return { supabase, user, admin };
}
