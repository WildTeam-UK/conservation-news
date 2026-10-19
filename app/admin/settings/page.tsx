import type { Metadata } from 'next';
import { AdminHeader } from '@/components/admin-header';
import { AdminNav } from '@/components/admin-nav';
import { AdminSettingsForm } from '@/components/admin-settings-form';
import { buildAdminProfile, profileInitials } from '@/lib/admin-profile';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'User settings | WILDNEWS editorial',
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const { user, admin } = await requireContentAdmin();
  const profile = await buildAdminProfile(user, admin);
  const initials = profileInitials(profile.firstName, profile.lastName, profile.displayName);

  return <main className="admin-page">
    <AdminHeader />
    <AdminNav active="settings" />
    <div className="admin-shell admin-settings-shell">
      <section className="admin-settings-heading">
        <p className="eyebrow">User settings</p>
        <h1>Your account</h1>
        <p>Manage the personal details used throughout your private WILDNEWS editorial workspace.</p>
      </section>
      <AdminSettingsForm firstName={profile.firstName} lastName={profile.lastName} email={profile.email} role={profile.role} avatarUrl={profile.avatarUrl} initials={initials} />
    </div>
  </main>;
}
