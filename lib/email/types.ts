export type EmailSendStatus = "sent" | "failed" | "not_configured" | "blocked" | "test";

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}

export interface EmailSendResult {
  status: EmailSendStatus;
  provider: string;
  providerMessageId?: string;
  error?: string;
  sentAt?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
