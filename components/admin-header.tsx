/* oxlint-disable next/no-html-link-for-pages -- full page navigation refreshes protected Supabase views reliably */
import { Settings } from 'lucide-react';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { getCurrentAdminProfile } from '@/lib/admin-profile';

export async function AdminHeader() {
  const profile = await getCurrentAdminProfile();

  return <header className="admin-header">
    <Brand />
    <div className="admin-account">
      <a className="admin-account-greeting" href="/admin/settings">Hey, {profile.greetingName}!</a>
      <a className="admin-account-settings" href="/admin/settings" aria-label="Open user settings"><Settings /></a>
      <AdminSignOutButton />
    </div>
  </header>;
}
