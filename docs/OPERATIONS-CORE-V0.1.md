# Operations Core v0.1

## Goal

Create the smallest useful internal operating system for ABE TechLab before introducing autonomous AI execution.

## Product areas

### Dashboard

The dashboard should answer five questions immediately:

1. What is new?
2. What needs attention?
3. Which opportunities are highest priority?
4. What is ARIA recommending?
5. What actions happened recently?

### CRM (Customer Relationship Management)

Core records:

- Organisations
- Contacts
- Leads
- Opportunities
- Activities

### Lead lifecycle

`New → Researching → Qualified → Outreach Ready → Contacted → Engaged → Opportunity → Won / Lost / Nurture`

### Lead scoring

Initial score dimensions:

- Service fit
- Organisation fit
- Evidence of need
- Decision-maker accessibility
- Timing signal
- Strategic value

AI-generated scores must always retain the reasons/evidence behind the score.

### Website intake

The public ABE TechLab website will be the first external lead source. Contact submissions should create or update structured records rather than only sending an email.

### ARIA workspace

ARIA v0.1 is advisory. It can:

- summarise leads
- research organisations when a research tool is connected
- suggest service fit
- score opportunities
- draft outreach
- recommend next actions

ARIA must not independently send external outreach in v0.1.

## Security requirements

- Private application
- Authenticated access
- Role-based permissions
- Server-side secrets only
- Audit log for material changes
- No customer data in client-side source code
- AI outputs clearly separated from verified business facts

## Success criteria

Operations Core v0.1 is complete when an authorised ABE TechLab user can:

1. Sign in.
2. View the operations dashboard.
3. Create and edit an organisation.
4. Add contacts.
5. Create and qualify a lead.
6. Move a lead through the pipeline.
7. View the activity history.
8. Receive a website-generated lead.
9. See an ARIA recommendation attached to a lead.
10. Audit who performed material actions.
