# ABE TechLab Operations Architecture

## System boundary

The public ABE TechLab website remains the external experience. ABE TechLab Operations is a separate private application connected to the website through authenticated APIs and event-driven integrations.

```text
Public website
    |
    | contact / lead / analytics events
    v
Operations API
    |
    +--> CRM
    +--> Research
    +--> Outreach
    +--> Content
    +--> Analytics
    |
    v
  ARIA
    |
    +--> recommendations
    +--> drafts
    +--> tool calls
    +--> approval requests
```

## Core entities

- Organisation
- Contact
- Lead
- Opportunity
- Activity
- Research record
- Outreach campaign
- Message
- Content item
- AI task
- Approval

## AI safety boundary

ARIA can analyse information and prepare recommendations without approval. External actions such as sending outreach, publishing content, changing customer records in bulk, or making commitments on behalf of ABE TechLab should initially require explicit approval.

## Data principle

Store structured business facts in the database. Store AI-generated reasoning, recommendations, and task results separately so generated content is distinguishable from verified company data.
