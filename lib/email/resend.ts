import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly apiKey = process.env.RESEND_API_KEY;

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey) {
      return {
        status: "not_configured",
        provider: this.name,
        error: "RESEND_API_KEY is not configured.",
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });

    const data = await response.json().catch(() => null) as { id?: string; message?: string } | null;

    if (!response.ok) {
      return {
        status: "failed",
        provider: this.name,
        error: data?.message ?? `Resend request failed with status ${response.status}.`,
      };
    }

    return {
      status: "sent",
      provider: this.name,
      providerMessageId: data?.id,
      sentAt: new Date().toISOString(),
    };
  }
}
