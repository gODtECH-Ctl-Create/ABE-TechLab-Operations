-- AI runtime persistence and governance.
-- Provider keys remain server-side; this migration stores metadata only.

create table if not exists public.ai_provider_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  task text not null,
  status text not null check (status in ('success','failed')),
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  request_id uuid,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_provider_usage_created_at_idx on public.ai_provider_usage(created_at desc);
create index if not exists ai_provider_usage_provider_idx on public.ai_provider_usage(provider, created_at desc);
create index if not exists ai_provider_usage_request_idx on public.ai_provider_usage(request_id);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  agent text not null,
  task text not null,
  mode text not null check (mode in ('off','advisory','action')),
  status text not null check (status in ('started','completed','failed')),
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_runs_created_at_idx on public.ai_runs(created_at desc);
create index if not exists ai_runs_agent_idx on public.ai_runs(agent, created_at desc);

create table if not exists public.ai_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_runs(id) on delete cascade,
  tool_name text not null,
  status text not null check (status in ('started','completed','failed','requires_review')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_tool_calls_run_idx on public.ai_tool_calls(run_id, created_at);

alter table public.ai_provider_usage enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_tool_calls enable row level security;

create policy "operations read ai provider usage" on public.ai_provider_usage
  for select to authenticated using (public.has_operations_access());
create policy "operations write ai provider usage" on public.ai_provider_usage
  for insert to authenticated with check (public.has_operations_access());

create policy "operations read ai runs" on public.ai_runs
  for select to authenticated using (public.has_operations_access());
create policy "operations write ai runs" on public.ai_runs
  for insert to authenticated with check (public.has_operations_access());

create policy "operations read ai tool calls" on public.ai_tool_calls
  for select to authenticated using (public.has_operations_access());
create policy "operations write ai tool calls" on public.ai_tool_calls
  for insert to authenticated with check (public.has_operations_access());
