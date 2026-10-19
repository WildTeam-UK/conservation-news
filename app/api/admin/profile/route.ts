import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const avatarTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

async function authenticatedAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return admin ? { supabase, user } : null;
}

function profileName(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const cleaned = value.trim();
  if (cleaned.length > 80) throw new Error(`${label} must be 80 characters or fewer.`);
  return cleaned;
}

export async function PUT(request: Request) {
  const auth = await authenticatedAdmin();
  if (!auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  try {
    const body = await request.json() as { firstName?: unknown; lastName?: unknown };
    const firstName = profileName(body.firstName, 'First name');
    const lastName = profileName(body.lastName, 'Last name');
    const { error } = await auth.supabase.auth.updateUser({ data: { ...auth.user.user_metadata, first_name: firstName, last_name: lastName } });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (caught) {
    return Response.json({ error: caught instanceof Error ? caught.message : 'Your details could not be saved.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticatedAdmin();
  if (!auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
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
    return Response.json({ error: caught instanceof Error ? caught.message : 'The avatar could not be uploaded.' }, { status: 400 });
  }
}

export async function DELETE() {
  const auth = await authenticatedAdmin();
  if (!auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
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
    return Response.json({ error: caught instanceof Error ? caught.message : 'The avatar could not be removed.' }, { status: 400 });
  }
}
