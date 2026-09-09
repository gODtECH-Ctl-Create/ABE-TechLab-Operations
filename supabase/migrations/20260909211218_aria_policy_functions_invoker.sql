create or replace function public.can_write_operations()
returns boolean language sql stable security invoker set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','operator'));
$$;
create or replace function public.can_review_operations()
returns boolean language sql stable security invoker set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','operator','reviewer'));
$$;
