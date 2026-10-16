import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { AdminLoginForm } from '@/components/admin-login-form';
import { Brand } from '@/components/brand';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial sign in | WILDNEWS',
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: admin } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (admin) redirect('/admin');
  }

  const params = searchParams ? await searchParams : undefined;
  const initialMessage = params?.reason === 'not-authorised'
    ? 'This account does not have access to the editorial dashboard.'
    : undefined;

  return (
    <main className="admin-login-page">
      <header className="admin-login-header"><Brand /></header>
      <section className="admin-login-card" aria-labelledby="admin-login-heading">
        <div className="admin-login-icon"><LockKeyhole /></div>
        <p className="eyebrow">Private editorial area</p>
        <h1 id="admin-login-heading">Review today&rsquo;s conservation stories.</h1>
        <p className="admin-login-intro">Sign in to review, edit and publish WildNews drafts.</p>
        <AdminLoginForm initialMessage={initialMessage} />
      </section>
    </main>
  );
}
