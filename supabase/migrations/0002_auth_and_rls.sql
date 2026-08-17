create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('admin','operator','reviewer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_operations_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','operator','reviewer')
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;

alter table public.organisations enable row level security;
alter table public.prospects enable row level security;
alter table public.research_requests enable row level security;
alter table public.research_sources enable row level security;
alter table public.qualifications enable row level security;
alter table public.leads enable row level security;
alter table public.outreach_strategies enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_messages enable row level security;
alter table public.email_events enable row level security;
alter table public.follow_ups enable row level security;
alter table public.audit_events enable row level security;

create policy "users can read own profile" on public.user_profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "users can update own profile" on public.user_profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "operations admins manage roles" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());
create policy "users can read own role" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());

create policy "operations access organisations" on public.organisations
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access prospects" on public.prospects
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access research requests" on public.research_requests
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access research sources" on public.research_sources
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access qualifications" on public.qualifications
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access leads" on public.leads
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access outreach strategies" on public.outreach_strategies
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access campaigns" on public.campaigns
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access campaign messages" on public.campaign_messages
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access email events" on public.email_events
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access follow ups" on public.follow_ups
  for all using (public.has_operations_access()) with check (public.has_operations_access());
create policy "operations access audit events" on public.audit_events
  for select using (public.has_operations_access());

create policy "operations write audit events" on public.audit_events
  for insert with check (public.has_operations_access());
