create extension if not exists pgcrypto;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  geography text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  status text not null default 'new' check (status in ('new','qualified','approved','rejected','converted')),
  likely_need text,
  recommended_service text,
  score integer check (score between 0 and 100),
  confidence integer check (confidence between 0 and 100),
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_requests (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  geography text,
  industries jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  provider text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  research_request_id uuid not null references public.research_requests(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  url text not null,
  title text not null,
  snippet text,
  provider text,
  retrieved_at timestamptz not null default now()
);

create table if not exists public.qualifications (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  classification text not null check (classification in ('high','medium','low')),
  confidence integer not null check (confidence between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  recommended_service text,
  next_action text,
  source text not null default 'baseline',
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  status text not null default 'new' check (status in ('new','contacted','engaged','qualified','won','lost','suppressed')),
  service_interest text,
  problem_summary text,
  score integer check (score between 0 and 100),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_strategies (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  objective text not null,
  service text,
  persona text,
  angle text,
  value_proposition text,
  talking_points jsonb not null default '[]'::jsonb,
  channel text not null,
  sequence jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  confidence integer check (confidence between 0 and 100),
  rationale jsonb not null default '[]'::jsonb,
  status text not null default 'needs_review' check (status in ('draft','needs_review','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.outreach_strategies(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','approved','active','paused','completed','cancelled')),
  channel text not null,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  stage text not null check (stage in ('first_touch','follow_up_1','follow_up_2')),
  subject text,
  body text not null,
  scheduled_for timestamptz,
  status text not null default 'draft' check (status in ('draft','approved','scheduled','sent','cancelled')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  campaign_message_id uuid references public.campaign_messages(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  campaign_message_id uuid not null references public.campaign_messages(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','eligible','sent','cancelled','blocked')),
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('human','aria','system','provider')),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_prospects_org on public.prospects(organisation_id);
create index if not exists idx_research_sources_request on public.research_sources(research_request_id);
create index if not exists idx_qualifications_prospect on public.qualifications(prospect_id, created_at desc);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_outreach_prospect on public.outreach_strategies(prospect_id);
create index if not exists idx_campaign_messages_campaign on public.campaign_messages(campaign_id);
create index if not exists idx_email_events_message on public.email_events(campaign_message_id, occurred_at desc);
create index if not exists idx_follow_ups_due on public.follow_ups(status, scheduled_for);
create index if not exists idx_audit_entity on public.audit_events(entity_type, entity_id, created_at desc);
