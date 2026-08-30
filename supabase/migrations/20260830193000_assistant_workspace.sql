create table if not exists public.assistant_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service text,
  description text,
  status text not null default 'active' check (status in ('draft','active','archived')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.assistant_workflows(id) on delete cascade,
  name text not null,
  description text,
  step_order integer not null,
  step_type text not null default 'discovery',
  required boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workflow_id, step_order)
);

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('website_chat','whatsapp','voice_call','email')),
  status text not null default 'active' check (status in ('active','waiting_client','waiting_ai','human_required','human_active','completed','paused')),
  workflow_id uuid references public.assistant_workflows(id) on delete set null,
  current_step_id uuid references public.assistant_workflow_steps(id) on delete set null,
  ai_enabled boolean not null default true,
  started_at timestamptz not null default now(),
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('client','assistant','human','system')),
  content text not null,
  message_type text not null default 'text' check (message_type in ('text','voice_transcript','email','system_event','tool_result')),
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_requirements (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  conversation_id uuid references public.assistant_conversations(id) on delete set null,
  workflow_id uuid references public.assistant_workflows(id) on delete set null,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  value_type text not null default 'text',
  source_message_id uuid references public.assistant_messages(id) on delete set null,
  confidence integer check (confidence between 0 and 100),
  status text not null default 'proposed' check (status in ('proposed','confirmed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.assistant_conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  action_type text not null,
  tool_name text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('pending','completed','failed','requires_review')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.assistant_handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  reason text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','accepted','resolved','cancelled')),
  assigned_to uuid,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  resolved_at timestamptz,
  notes text
);

create table if not exists public.assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  service text,
  content text not null,
  version integer not null default 1,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_conversations_lead on public.assistant_conversations(lead_id, created_at desc);
create index if not exists idx_assistant_conversations_status on public.assistant_conversations(status, last_message_at desc);
create index if not exists idx_assistant_messages_conversation on public.assistant_messages(conversation_id, created_at);
create index if not exists idx_assistant_requirements_lead on public.assistant_requirements(lead_id, updated_at desc);
create index if not exists idx_assistant_actions_conversation on public.assistant_actions(conversation_id, created_at desc);
create index if not exists idx_assistant_handoffs_status on public.assistant_handoffs(status, requested_at desc);

alter table public.assistant_workflows enable row level security;
alter table public.assistant_workflow_steps enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_requirements enable row level security;
alter table public.assistant_actions enable row level security;
alter table public.assistant_handoffs enable row level security;
alter table public.assistant_knowledge enable row level security;

create policy assistant_workflows_authenticated_select on public.assistant_workflows for select to authenticated using (true);
create policy assistant_workflow_steps_authenticated_select on public.assistant_workflow_steps for select to authenticated using (true);
create policy assistant_conversations_authenticated_select on public.assistant_conversations for select to authenticated using (true);
create policy assistant_messages_authenticated_select on public.assistant_messages for select to authenticated using (true);
create policy assistant_requirements_authenticated_select on public.assistant_requirements for select to authenticated using (true);
create policy assistant_actions_authenticated_select on public.assistant_actions for select to authenticated using (true);
create policy assistant_handoffs_authenticated_select on public.assistant_handoffs for select to authenticated using (true);
create policy assistant_knowledge_authenticated_select on public.assistant_knowledge for select to authenticated using (true);
