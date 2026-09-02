-- Lightweight heartbeat used only to generate regular Supabase database activity.
-- The table is isolated from ABE TechLab Operations business data.
create table if not exists public.system_heartbeat (
  id integer primary key check (id = 1),
  name text not null default 'supabase',
  created_at timestamptz not null default now()
);

-- Keep exactly one stable heartbeat row.
insert into public.system_heartbeat (id, name)
values (1, 'supabase')
on conflict (id) do nothing;

-- The heartbeat endpoint uses the publishable key, so expose only this row
-- for read access and protect the table with Row Level Security (RLS).
revoke all on table public.system_heartbeat from anon, authenticated;
grant select on table public.system_heartbeat to anon, authenticated;

alter table public.system_heartbeat enable row level security;

create policy "system heartbeat is publicly readable"
on public.system_heartbeat
for select
to anon, authenticated
using (id = 1);
