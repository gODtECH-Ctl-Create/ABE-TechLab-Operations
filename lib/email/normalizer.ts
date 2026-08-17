import type { EmailEvent, EmailEventType } from "./events";

export interface IncomingEmailEvent {
  provider: string;
  providerEventId: string;
  type: EmailEventType;
  providerMessageId?: string;
  campaignId?: string;
  leadId?: string;
  recipient?: string;
  occurredAt?: string;
  raw?: unknown;
}

export function normalizeIncomingEmailEvent(input: IncomingEmailEvent): EmailEvent {
  return {
    id: `${input.provider}:${input.providerEventId}`,
    provider: input.provider,
    providerEventId: input.providerEventId,
    type: input.type,
    emailId: input.providerMessageId,
    campaignId: input.campaignId,
    leadId: input.leadId,
    messageId: input.providerMessageId,
    recipient: input.recipient,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    raw: input.raw,
  };
}
