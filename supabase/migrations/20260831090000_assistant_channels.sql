create table if not exists public.assistant_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service text,
  description text,
  status text not null default 'active',
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
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('website_chat','whatsapp','voice_call','email')),
  status text not null default 'active',
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
  message_type text not null default 'text',
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
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.assistant_conversations(id) on delete set null,
  lead_id uuid references public.leads(id) on delete cascade,
  action_type text not null,
  tool_name text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.assistant_handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  reason text not null,
  priority text not null default 'normal',
  status text not null default 'open',
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
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_conversations_lead on public.assistant_conversations(lead_id, last_message_at desc);
create index if not exists idx_assistant_messages_conversation on public.assistant_messages(conversation_id, created_at);
create index if not exists idx_assistant_requirements_lead on public.assistant_requirements(lead_id, updated_at desc);
create index if not exists idx_assistant_actions_conversation on public.assistant_actions(conversation_id, created_at desc);
create index if not exists idx_assistant_handoffs_status on public.assistant_handoffs(status, requested_at desc);
create index if not exists idx_assistant_workflow_steps_order on public.assistant_workflow_steps(workflow_id, step_order);

insert into public.assistant_workflows(name, service, description, status, version)
select 'Website Development Discovery', 'Website or web application', 'Guided discovery for website and web application enquiries.', 'active', 1
where not exists (select 1 from public.assistant_workflows where name = 'Website Development Discovery' and version = 1);

insert into public.assistant_workflows(name, service, description, status, version)
select 'General Client Discovery', null, 'Fallback discovery workflow for enquiries that do not map cleanly to a service.', 'active', 1
where not exists (select 1 from public.assistant_workflows where name = 'General Client Discovery' and version = 1);

with workflow as (
  select id from public.assistant_workflows where name = 'Website Development Discovery' and version = 1 limit 1
)
insert into public.assistant_workflow_steps(workflow_id, name, description, step_order, step_type, required)
select workflow.id, step.name, step.description, step.step_order, step.step_type, true
from workflow
cross join (values
  ('Understand the project', 'Clarify the business goal and project outcome.', 1, 'discovery'),
  ('Business context', 'Collect business, audience and market context.', 2, 'discovery'),
  ('Website requirements', 'Collect pages, features, content and integrations.', 3, 'discovery'),
  ('Timeline and budget', 'Confirm desired timeline and budget range.', 4, 'qualification'),
  ('Requirement summary', 'Prepare a structured summary for internal review.', 5, 'handoff')
) as step(name, description, step_order, step_type)
where not exists (select 1 from public.assistant_workflow_steps s where s.workflow_id = workflow.id and s.step_order = step.step_order);
