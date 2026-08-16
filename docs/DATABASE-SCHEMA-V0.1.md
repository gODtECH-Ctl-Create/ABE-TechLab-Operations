# Initial Data Model v0.1

The database should keep verified business records separate from AI-generated analysis.

## organisations

- id
- name
- website
- industry
- location
- description
- status
- source
- created_at
- updated_at

## contacts

- id
- organisation_id
- full_name
- role
- email
- phone
- linkedin_url
- status
- created_at
- updated_at

## leads

- id
- organisation_id
- primary_contact_id
- source
- problem_summary
- service_interest
- status
- score
- score_reasons
- next_action
- owner_id
- created_at
- updated_at

## opportunities

- id
- lead_id
- name
- estimated_value
- stage
- probability
- expected_close_date
- notes
- owner_id
- created_at
- updated_at

## activities

- id
- organisation_id
- contact_id
- lead_id
- opportunity_id
- activity_type
- direction
- subject
- summary
- actor_type
- actor_id
- metadata
- created_at

## aria_tasks

- id
- lead_id
- task_type
- status
- input_context
- output
- model
- confidence
- created_at
- completed_at

## approvals

- id
- aria_task_id
- action_type
- requested_action
- status
- reviewed_by
- reviewed_at
- review_note

## Important rule

AI-generated fields are recommendations, not authoritative facts. The application should preserve the source and evidence for generated scores or recommendations where possible.
