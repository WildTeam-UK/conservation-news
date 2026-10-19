import type { User } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireContentAdmin } from '@/lib/supabase/require-admin';

type AdminRecord = {
  display_name: string | null;
  email: string;
  role: string;
  active: boolean;
};

type ProfileMetadata = {
  first_name?: unknown;
  last_name?: unknown;
  avatar_path?: unknown;
};

function metadataText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function buildAdminProfile(user: User, admin: AdminRecord) {
  const metadata = user.user_metadata as ProfileMetadata;
  const firstName = metadataText(metadata.first_name);
  const lastName = metadataText(metadata.last_name);
  const avatarPath = metadataText(metadata.avatar_path);
  const explicitName = [firstName, lastName].filter(Boolean).join(' ');
  const displayName = explicitName || admin.display_name || user.email || admin.email;
  let avatarUrl: string | null = null;

  if (avatarPath) {
    const { data } = await getSupabaseAdminClient().storage.from('admin-avatars').createSignedUrl(avatarPath, 60 * 60);
    avatarUrl = data?.signedUrl ?? null;
  }

  return {
    firstName,
    lastName,
    displayName,
    greetingName: firstName || displayName,
    email: user.email || admin.email,
    role: admin.role,
    active: admin.active,
    avatarPath,
    avatarUrl,
  };
}

export async function getCurrentAdminProfile() {
  const { user, admin } = await requireContentAdmin();
  return buildAdminProfile(user, admin);
}

export function profileInitials(firstName: string, lastName: string, displayName: string) {
  const explicit = [firstName, lastName].filter(Boolean).map((part) => part[0]).join('');
  if (explicit) return explicit.slice(0, 2).toUpperCase();
  return displayName.slice(0, 1).toUpperCase();
}
