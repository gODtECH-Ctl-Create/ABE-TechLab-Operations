-- Operations hardening + Contacts

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  role_title text,
  email text,
  phone text,
  is_decision_maker boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_org on public.contacts(organisation_id);
create index if not exists idx_contacts_email on public.contacts(email);

alter table public.contacts enable row level security;

create or replace function public.can_write_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','operator')
  );
$$;

create or replace function public.can_review_operations()
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

create policy "operations access contacts" on public.contacts
  for select using (public.has_operations_access());
create policy "operations create contacts" on public.contacts
  for insert with check (public.can_write_operations());
create policy "operations update contacts" on public.contacts
  for update using (public.can_write_operations()) with check (public.can_write_operations());
create policy "operations delete contacts" on public.contacts
  for delete using (public.can_write_operations());

-- Harden core operational records: everyone can read; only admins/operators mutate.

drop policy if exists "operations access organisations" on public.organisations;
create policy "operations read organisations" on public.organisations
  for select using (public.has_operations_access());
create policy "operations write organisations" on public.organisations
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access prospects" on public.prospects;
create policy "operations read prospects" on public.prospects
  for select using (public.has_operations_access());
create policy "operations write prospects" on public.prospects
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access research requests" on public.research_requests;
create policy "operations read research requests" on public.research_requests
  for select using (public.has_operations_access());
create policy "operations write research requests" on public.research_requests
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access research sources" on public.research_sources;
create policy "operations read research sources" on public.research_sources
  for select using (public.has_operations_access());
create policy "operations write research sources" on public.research_sources
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access qualifications" on public.qualifications;
create policy "operations read qualifications" on public.qualifications
  for select using (public.has_operations_access());
create policy "operations write qualifications" on public.qualifications
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access leads" on public.leads;
create policy "operations read leads" on public.leads
  for select using (public.has_operations_access());
create policy "operations write leads" on public.leads
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access outreach strategies" on public.outreach_strategies;
create policy "operations read outreach strategies" on public.outreach_strategies
  for select using (public.has_operations_access());
create policy "operations write outreach strategies" on public.outreach_strategies
  for all using (public.can_write_operations()) with check (public.can_write_operations());
create policy "reviewers can approve outreach strategies" on public.outreach_strategies
  for update using (public.can_review_operations()) with check (public.can_review_operations());

drop policy if exists "operations access campaigns" on public.campaigns;
create policy "operations read campaigns" on public.campaigns
  for select using (public.has_operations_access());
create policy "operations write campaigns" on public.campaigns
  for all using (public.can_write_operations()) with check (public.can_write_operations());
create policy "reviewers can approve campaigns" on public.campaigns
  for update using (public.can_review_operations()) with check (public.can_review_operations());

drop policy if exists "operations access campaign messages" on public.campaign_messages;
create policy "operations read campaign messages" on public.campaign_messages
  for select using (public.has_operations_access());
create policy "operations write campaign messages" on public.campaign_messages
  for all using (public.can_write_operations()) with check (public.can_write_operations());

drop policy if exists "operations access email events" on public.email_events;
create policy "operations read email events" on public.email_events
  for select using (public.has_operations_access());
create policy "operations write email events" on public.email_events
  for insert with check (public.can_write_operations());

drop policy if exists "operations access follow ups" on public.follow_ups;
create policy "operations read follow ups" on public.follow_ups
  for select using (public.has_operations_access());
create policy "operations write follow ups" on public.follow_ups
  for all using (public.can_write_operations()) with check (public.can_write_operations());

-- Legacy approval_queue remains for backward compatibility, but is no longer an open-write table.
drop policy if exists "authenticated users can view approval queue" on public.approval_queue;
drop policy if exists "operators can create approval items" on public.approval_queue;
drop policy if exists "authenticated users can review approval items" on public.approval_queue;
create policy "operations read legacy approval queue" on public.approval_queue
  for select using (public.has_operations_access());
create policy "operations create legacy approval queue" on public.approval_queue
  for insert with check (public.can_write_operations());
create policy "operations review legacy approval queue" on public.approval_queue
  for update using (public.can_review_operations()) with check (public.can_review_operations());

-- Contacts are part of the customer system but should not be publicly exposed.
