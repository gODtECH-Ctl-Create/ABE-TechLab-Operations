export const AUDIT_ACTIONS = {
  prospectCreated: "prospect.created",
  researchRequested: "research.requested",
  researchCompleted: "research.completed",
  qualificationCreated: "qualification.created",
  qualificationOverridden: "qualification.overridden",
  outreachStrategyGenerated: "outreach.strategy_generated",
  outreachStrategyEdited: "outreach.strategy_edited",
  outreachApproved: "outreach.approved",
  outreachRejected: "outreach.rejected",
  campaignCreated: "campaign.created",
  campaignApproved: "campaign.approved",
  messageScheduled: "message.scheduled",
  messageSent: "message.sent",
  emailEventReceived: "email.event_received",
  followUpScheduled: "follow_up.scheduled",
  followUpBlocked: "follow_up.blocked",
  followUpSent: "follow_up.sent",
  leadCreated: "lead.created",
  leadStatusChanged: "lead.status_changed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
