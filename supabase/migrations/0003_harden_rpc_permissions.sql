revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.has_operations_access() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;
grant execute on function public.has_operations_access() to service_role;
