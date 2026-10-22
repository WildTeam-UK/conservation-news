-- Keep admin policy checks within the signed-in user's existing RLS access.
create or replace function public.is_content_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_content_admin() from public, anon;
grant execute on function public.is_content_admin() to authenticated;

drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- This event-trigger function enables RLS for newly created public tables. It
-- is invoked by PostgreSQL itself and must not be callable through the API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
