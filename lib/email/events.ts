export type EmailEventType =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked"
  | "received"
  | "unsubscribed";

export interface EmailEvent {
  id: string;
  provider: string;
  providerEventId: string;
  type: EmailEventType;
  emailId?: string;
  campaignId?: string;
  leadId?: string;
  messageId?: string;
  recipient?: string;
  occurredAt: string;
  raw?: unknown;
}

export interface FollowUpDecision {
  eligible: boolean;
  reason: string;
  nextStage?: "follow_up_1" | "follow_up_2";
  dueAt?: string;
}
