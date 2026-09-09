create or replace function public.can_write_operations()
returns boolean language sql stable security invoker set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','operator'));
$$;
create or replace function public.can_review_operations()
returns boolean language sql stable security invoker set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','operator','reviewer'));
$$;
revoke execute on function public.can_write_operations() from public, anon;
revoke execute on function public.can_review_operations() from public, anon;
grant execute on function public.can_write_operations() to authenticated, service_role;
grant execute on function public.can_review_operations() to authenticated, service_role;

create table if not exists public.aria_action_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_type text not null check (proposal_type in ('follow_up','task','opportunity_update','outreach_strategy','invoice_reminder')),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 3 and 2000),
  rationale text,
  target_label text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested')),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aria_action_proposals_status_idx
  on public.aria_action_proposals(status, created_at desc);

alter table public.aria_action_proposals enable row level security;

create policy "operations read aria proposals" on public.aria_action_proposals
  for select to authenticated using (public.has_operations_access());
create policy "operators create aria proposals" on public.aria_action_proposals
  for insert to authenticated with check (public.can_write_operations() and created_by = (select auth.uid()));
create policy "reviewers decide aria proposals" on public.aria_action_proposals
  for update to authenticated using (public.can_review_operations()) with check (public.can_review_operations());

create or replace function public.set_aria_action_proposal_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger aria_action_proposals_updated_at
before update on public.aria_action_proposals
for each row execute function public.set_aria_action_proposal_updated_at();
