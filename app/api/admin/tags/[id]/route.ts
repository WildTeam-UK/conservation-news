import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireApiAdmin } from '@/lib/supabase/require-api-admin';
import { normalizeTaxonomyKey, tagSlug } from '@/lib/taxonomy-text';
import { isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const tagTypes = new Set(['species', 'place', 'habitat', 'theme']);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'A valid tag is required.' }, { status: 400 });
  const auth = await requireApiAdmin();
  if ('response' in auth) return Response.json({ error: 'Editorial access required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: string; name?: string; tagType?: string; description?: string; seoTitle?: string; metaDescription?: string; aliases?: string[]; targetId?: string } | null;
  if (!body?.action) return Response.json({ error: 'Choose a tag action.' }, { status: 400 });
  const supabase = getSupabaseAdminClient();

  try {
    if (body.action === 'approve' || body.action === 'retire' || body.action === 'restore') {
      if (body.action === 'approve') {
        const [{ count, error: countError }, { data: settings, error: settingsError }] = await Promise.all([
          supabase.from('story_tags').select('story_id, stories!inner(status)', { count: 'exact', head: true }).eq('tag_id', id).eq('stories.status', 'published'),
          supabase.from('taxonomy_settings').select('min_published_stories').eq('id', true).single(),
        ]);
        if (countError || settingsError || !settings) throw countError ?? settingsError ?? new Error('Taxonomy settings were not found.');
        if ((count ?? 0) < settings.min_published_stories) return Response.json({ error: `This tag needs ${settings.min_published_stories} published articles before it can go live.` }, { status: 409 });
      }
      const status = body.action === 'restore' ? 'proposed' : body.action === 'retire' ? 'retired' : 'approved';
      const { error } = await supabase.from('content_tags').update({ status }).eq('id', id);
      if (error) throw error;
    } else if (body.action === 'update') {
      const name = body.name?.trim().slice(0, 120) ?? '';
      const tagType = body.tagType ?? '';
      if (!name || !tagTypes.has(tagType)) return Response.json({ error: 'Enter a valid tag name and type.' }, { status: 400 });
      const aliases = [...new Set((body.aliases ?? []).map((alias) => alias.trim().slice(0, 120)).filter((alias) => alias && normalizeTaxonomyKey(alias) !== normalizeTaxonomyKey(name)))].slice(0, 20);
      const { error: updateError } = await supabase.from('content_tags').update({ name, slug: tagSlug(name), tag_type: tagType, description: body.description?.trim().slice(0, 500) || null, seo_title: body.seoTitle?.trim().slice(0, 120) || null, meta_description: body.metaDescription?.trim().slice(0, 200) || null }).eq('id', id);
      if (updateError) throw updateError;
      const { error: deleteError } = await supabase.from('content_tag_aliases').delete().eq('tag_id', id);
      if (deleteError) throw deleteError;
      if (aliases.length) {
        const { error: aliasError } = await supabase.from('content_tag_aliases').insert(aliases.map((alias) => ({ tag_id: id, alias, normalized_alias: normalizeTaxonomyKey(alias) })));
        if (aliasError) throw aliasError;
      }
    } else if (body.action === 'merge') {
      const targetId = body.targetId ?? '';
      if (!isUuid(targetId) || targetId === id) return Response.json({ error: 'Choose a different tag to keep.' }, { status: 400 });
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
      const aliasesToMove = [{ alias: source.name, normalized_alias: normalizeTaxonomyKey(source.name) }, ...(sourceAliases ?? [])];
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
