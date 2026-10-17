import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tagTypes = new Set(['species', 'place', 'habitat', 'theme']);

function normalizeTag(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tagSlug(value: string) {
  return normalizeTag(value).replace(/\s+/g, '-') || 'tag';
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle();
  return admin ? user : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return Response.json({ error: 'A valid tag is required.' }, { status: 400 });
  if (!await requireAdmin()) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: string; name?: string; tagType?: string; description?: string; seoTitle?: string; metaDescription?: string; aliases?: string[]; targetId?: string } | null;
  if (!body?.action) return Response.json({ error: 'Choose a tag action.' }, { status: 400 });
  const supabase = getSupabaseAdminClient();

  try {
    if (body.action === 'approve' || body.action === 'retire' || body.action === 'restore') {
      const status = body.action === 'restore' ? 'proposed' : body.action === 'retire' ? 'retired' : 'approved';
      const { error } = await supabase.from('content_tags').update({ status }).eq('id', id);
      if (error) throw error;
    } else if (body.action === 'update') {
      const name = body.name?.trim().slice(0, 120) ?? '';
      const tagType = body.tagType ?? '';
      if (!name || !tagTypes.has(tagType)) return Response.json({ error: 'Enter a valid tag name and type.' }, { status: 400 });
      const aliases = [...new Set((body.aliases ?? []).map((alias) => alias.trim().slice(0, 120)).filter((alias) => alias && normalizeTag(alias) !== normalizeTag(name)))].slice(0, 20);
      const { error: updateError } = await supabase.from('content_tags').update({ name, slug: tagSlug(name), tag_type: tagType, description: body.description?.trim().slice(0, 500) || null, seo_title: body.seoTitle?.trim().slice(0, 120) || null, meta_description: body.metaDescription?.trim().slice(0, 200) || null }).eq('id', id);
      if (updateError) throw updateError;
      const { error: deleteError } = await supabase.from('content_tag_aliases').delete().eq('tag_id', id);
      if (deleteError) throw deleteError;
      if (aliases.length) {
        const { error: aliasError } = await supabase.from('content_tag_aliases').insert(aliases.map((alias) => ({ tag_id: id, alias, normalized_alias: normalizeTag(alias) })));
        if (aliasError) throw aliasError;
      }
    } else if (body.action === 'merge') {
      const targetId = body.targetId ?? '';
      if (!uuidPattern.test(targetId) || targetId === id) return Response.json({ error: 'Choose a different tag to keep.' }, { status: 400 });
      const [{ data: source, error: sourceError }, { data: target, error: targetError }] = await Promise.all([
        supabase.from('content_tags').select('id, name').eq('id', id).single(),
        supabase.from('content_tags').select('id').eq('id', targetId).neq('status', 'retired').single(),
      ]);
      if (sourceError || !source || targetError || !target) return Response.json({ error: 'The selected tags could not be merged.' }, { status: 404 });
      const [{ data: clusterLinks, error: clusterError }, { data: storyLinks, error: storyError }, { data: sourceAliases, error: aliasReadError }] = await Promise.all([
        supabase.from('story_cluster_tags').select('cluster_id, confidence, rationale').eq('tag_id', id),
        supabase.from('story_tags').select('story_id').eq('tag_id', id),
        supabase.from('content_tag_aliases').select('alias, normalized_alias').eq('tag_id', id),
      ]);
      if (clusterError || storyError || aliasReadError) throw clusterError ?? storyError ?? aliasReadError;
      if (clusterLinks?.length) {
        const { error } = await supabase.from('story_cluster_tags').upsert(clusterLinks.map((link) => ({ ...link, tag_id: targetId })), { onConflict: 'cluster_id,tag_id', ignoreDuplicates: true });
        if (error) throw error;
      }
      if (storyLinks?.length) {
        const { error } = await supabase.from('story_tags').upsert(storyLinks.map((link) => ({ ...link, tag_id: targetId })), { onConflict: 'story_id,tag_id', ignoreDuplicates: true });
        if (error) throw error;
      }
      const aliasesToMove = [{ alias: source.name, normalized_alias: normalizeTag(source.name) }, ...(sourceAliases ?? [])];
      if (aliasesToMove.length) await supabase.from('content_tag_aliases').upsert(aliasesToMove.map((alias) => ({ ...alias, tag_id: targetId })), { onConflict: 'normalized_alias', ignoreDuplicates: true });
      const { error: deleteError } = await supabase.from('content_tags').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } else {
      return Response.json({ error: 'Unknown tag action.' }, { status: 400 });
    }
    return Response.json({ saved: true });
  } catch (error) {
    console.error('Tag update failed', error);
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const message = code === '23505' ? 'That name or alias is already used by another tag. Merge the duplicates instead.' : 'The tag could not be updated.';
    return Response.json({ error: message }, { status: 500 });
  }
}
