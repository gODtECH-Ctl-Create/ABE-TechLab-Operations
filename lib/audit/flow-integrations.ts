import type { OperationsRepositories } from "../data/repository";
import { recordAudit, recordAriaAction, recordHumanDecision } from "./service";
import { AUDIT_ACTIONS } from "./actions";

export async function auditQualificationCreated(
  repositories: OperationsRepositories,
  qualificationId: string,
  prospectId: string,
  score: number,
  confidence: number,
) {
  return recordAriaAction(repositories, {
    action: AUDIT_ACTIONS.qualificationCreated,
    entityType: "qualification",
    entityId: qualificationId,
    metadata: { prospectId, score, confidence },
  });
}

export async function auditQualificationOverride(
  repositories: OperationsRepositories,
  qualificationId: string,
  reviewerId: string,
  reason: string,
  previousScore: number,
  newScore: number,
) {
  return recordHumanDecision(repositories, {
    actorId: reviewerId,
    action: AUDIT_ACTIONS.qualificationOverridden,
    entityType: "qualification",
    entityId: qualificationId,
    metadata: { reason, previousScore, newScore },
  });
}

export async function auditOutreachApproval(
  repositories: OperationsRepositories,
  strategyId: string,
  reviewerId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  return recordHumanDecision(repositories, {
    actorId: reviewerId,
    action: decision === "approved" ? AUDIT_ACTIONS.outreachApproved : AUDIT_ACTIONS.outreachRejected,
    entityType: "outreach_strategy",
    entityId: strategyId,
    metadata: { decision, reason },
  });
}

export async function auditCampaignApproved(
  repositories: OperationsRepositories,
  campaignId: string,
  reviewerId: string,
) {
  return recordHumanDecision(repositories, {
    actorId: reviewerId,
    action: AUDIT_ACTIONS.campaignApproved,
    entityType: "campaign",
    entityId: campaignId,
  });
}

export async function auditEmailEvent(
  repositories: OperationsRepositories,
  event: {
    eventType: string;
    provider: string;
    providerEventId: string;
    campaignId?: string;
    messageId?: string;
    leadId?: string;
    occurredAt: string;
  },
) {
  const persistence = await repositories.emailEvents.create({
    provider: event.provider,
    provider_event_id: event.providerEventId,
    event_type: event.eventType,
    campaign_id: event.campaignId,
    campaign_message_id: event.messageId,
    lead_id: event.leadId,
    occurred_at: event.occurredAt,
    payload: {},
  });

  if (persistence.error) return persistence;

  await recordAudit(repositories, {
    actorType: "provider",
    action: AUDIT_ACTIONS.emailEventReceived,
    entityType: "email_event",
    entityId: persistence.data?.id as string | undefined,
    metadata: {
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      campaignId: event.campaignId,
      messageId: event.messageId,
      leadId: event.leadId,
    },
  });

  return persistence;
}
