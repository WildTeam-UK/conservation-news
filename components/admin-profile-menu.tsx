/* oxlint-disable next/no-html-link-for-pages -- full page navigation refreshes protected Supabase views reliably */
import { Settings } from 'lucide-react';
import { getCurrentAdminProfile, profileInitials } from '@/lib/admin-profile';

export async function AdminProfileMenu({ active = false }: { active?: boolean }) {
  const profile = await getCurrentAdminProfile();
  const initials = profileInitials(profile.firstName, profile.lastName, profile.displayName);

  return <a className={`admin-nav-profile${active ? ' active' : ''}`} href="/admin/settings" aria-label="Open user settings" aria-current={active ? 'page' : undefined}>
    <span className="admin-nav-avatar">{profile.avatarUrl ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={profile.avatarUrl} alt="" /></> : initials}</span>
    <span className="admin-nav-profile-copy"><strong>{profile.displayName}</strong><small>{profile.email}</small></span>
    <Settings className="admin-nav-settings-icon" />
  </a>;
}
