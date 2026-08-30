-- Store the lead's requested AI follow-up channel from the public website.
-- Kept nullable for backward compatibility with older website submissions.

alter table public.leads
  add column if not exists preferred_contact_channel text;

alter table public.leads
  drop constraint if exists leads_preferred_contact_channel_check;

alter table public.leads
  add constraint leads_preferred_contact_channel_check
  check (
    preferred_contact_channel is null
    or preferred_contact_channel in ('website_chat', 'whatsapp', 'voice_call', 'email')
  );

create index if not exists idx_leads_preferred_contact_channel
  on public.leads(preferred_contact_channel);
