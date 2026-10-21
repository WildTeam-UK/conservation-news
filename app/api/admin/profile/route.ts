import { unexpectedErrorResponse } from '@/lib/api-errors';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';

const avatarTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

class ProfileValidationError extends Error {}

function profileName(value: unknown, label: string) {
  if (typeof value !== 'string') throw new ProfileValidationError(`${label} must be text.`);
  const cleaned = value.trim();
  if (cleaned.length > 80) throw new ProfileValidationError(`${label} must be 80 characters or fewer.`);
  return cleaned;
}

export async function PUT(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null) as { firstName?: unknown; lastName?: unknown } | null;
    if (!body) return Response.json({ error: 'Enter valid profile details.' }, { status: 400 });
    const firstName = profileName(body.firstName, 'First name');
    const lastName = profileName(body.lastName, 'Last name');
    const { error } = await auth.supabase.auth.updateUser({ data: { ...auth.user.user_metadata, first_name: firstName, last_name: lastName } });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (caught) {
    if (caught instanceof ProfileValidationError) return Response.json({ error: caught.message }, { status: 400 });
    return unexpectedErrorResponse('Profile details save failed', caught, 'Your details could not be saved.');
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const formData = await request.formData();
    const avatar = formData.get('avatar');
    if (!(avatar instanceof File)) return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    const extension = avatarTypes.get(avatar.type);
    if (!extension) return Response.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 });
    if (avatar.size > 2 * 1024 * 1024) return Response.json({ error: 'The avatar must be smaller than 2 MB.' }, { status: 400 });

    const storage = getSupabaseAdminClient().storage.from('admin-avatars');
    const oldPath = typeof auth.user.user_metadata.avatar_path === 'string' ? auth.user.user_metadata.avatar_path : '';
    const avatarPath = `${auth.user.id}/avatar.${extension}`;
    const { error: uploadError } = await storage.upload(avatarPath, new Uint8Array(await avatar.arrayBuffer()), { contentType: avatar.type, upsert: true });
    if (uploadError) throw uploadError;
    if (oldPath && oldPath !== avatarPath) await storage.remove([oldPath]);

    const { error: updateError } = await auth.supabase.auth.updateUser({ data: { ...auth.user.user_metadata, avatar_path: avatarPath } });
    if (updateError) throw updateError;
    const { data, error: signedError } = await storage.createSignedUrl(avatarPath, 60 * 60);
    if (signedError) throw signedError;
    return Response.json({ avatarUrl: data.signedUrl });
  } catch (caught) {
    return unexpectedErrorResponse('Avatar upload failed', caught, 'The avatar could not be uploaded.');
  }
}

export async function DELETE() {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const avatarPath = typeof auth.user.user_metadata.avatar_path === 'string' ? auth.user.user_metadata.avatar_path : '';
    if (avatarPath) {
      const { error } = await getSupabaseAdminClient().storage.from('admin-avatars').remove([avatarPath]);
      if (error) throw error;
    }
    const { error } = await auth.supabase.auth.updateUser({ data: { ...auth.user.user_metadata, avatar_path: null } });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (caught) {
    return unexpectedErrorResponse('Avatar removal failed', caught, 'The avatar could not be removed.');
  }
}
