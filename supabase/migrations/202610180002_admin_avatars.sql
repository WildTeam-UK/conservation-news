-- Private storage for editorial user avatars. Profile names remain in Supabase Auth metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-avatars', 'admin-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
