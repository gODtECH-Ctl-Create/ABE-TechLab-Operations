create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'Draft' check (status in ('Draft','Sent','Partially Paid','Paid','Void')),
  currency text not null default 'NGN',
  business_name text not null,
  business_address text,
  business_phone text,
  business_email text,
  business_website text,
  client_company text not null,
  client_contact text,
  client_address text,
  client_email text,
  client_phone text,
  project text,
  amount_paid numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  bank_name text,
  account_name text,
  account_number text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  details text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoices_created_at_idx on public.invoices(created_at desc);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id, sort_order);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "operations access invoices" on public.invoices
  for all using (public.has_operations_access()) with check (public.has_operations_access());

create policy "operations access invoice items" on public.invoice_items
  for all using (public.has_operations_access()) with check (public.has_operations_access());
