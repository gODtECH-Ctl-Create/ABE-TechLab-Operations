create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_role() from public, anon, authenticated;
grant execute on function public.get_my_role() to authenticated;
