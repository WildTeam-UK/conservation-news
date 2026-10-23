/* oxlint-disable next/no-html-link-for-pages -- full page navigation refreshes protected Supabase views reliably */
import { ExternalLink } from 'lucide-react';
import { AdminMobileNavToggle } from '@/components/admin-mobile-nav-toggle';
import { AdminSignOutButton } from '@/components/admin-sign-out-button';
import { Brand } from '@/components/brand';
import { getCurrentAdminProfile } from '@/lib/admin-profile';

export async function AdminHeader() {
  const profile = await getCurrentAdminProfile();

  return <header className="admin-header">
    <Brand />
    <AdminMobileNavToggle />
    <div className="admin-account">
      <a className="admin-account-greeting" href="/admin/settings">Hey, {profile.greetingName}!</a>
      <a className="admin-view-site" href="/" target="_blank" rel="noopener noreferrer">View site <ExternalLink /></a>
      <AdminSignOutButton />
    </div>
  </header>;
}
