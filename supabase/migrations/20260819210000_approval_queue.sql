create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  entity_type text not null check (entity_type in ('lead','organisation','opportunity','outreach','research')),
  entity_id uuid,
  action_type text not null,
  proposed_by text not null default 'system',
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_queue_status_idx on public.approval_queue(status, created_at desc);
create index if not exists approval_queue_entity_idx on public.approval_queue(entity_type, entity_id);

alter table public.approval_queue enable row level security;

create policy "authenticated users can view approval queue"
  on public.approval_queue for select
  to authenticated
  using (true);

create policy "operators can create approval items"
  on public.approval_queue for insert
  to authenticated
  with check (true);

create policy "authenticated users can review approval items"
  on public.approval_queue for update
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_approval_queue_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists approval_queue_updated_at on public.approval_queue;
create trigger approval_queue_updated_at
before update on public.approval_queue
for each row execute function public.set_approval_queue_updated_at();
