import type { ApprovedCampaign } from "../outreach/review";
import type { EmailProvider, EmailSendResult } from "./types";

export async function sendApprovedCampaign(
  campaign: ApprovedCampaign,
  recipient: string,
  provider: EmailProvider,
  from: string,
): Promise<EmailSendResult> {
  if (!campaign.sendable && process.env.ALLOW_REAL_OUTREACH !== "true") {
    return {
      status: "blocked",
      provider: provider.name,
      error: "Real outreach is disabled. Set ALLOW_REAL_OUTREACH=true only after production safeguards are configured.",
    };
  }

  const firstMessage = campaign.messages.find((message) => message.stage === "first_touch");
  if (!firstMessage) {
    return {
      status: "failed",
      provider: provider.name,
      error: "Campaign has no first-touch message.",
    };
  }

  return provider.send({
    to: recipient,
    from,
    subject: firstMessage.subject ?? "A quick question",
    html: firstMessage.body.replace(/\n/g, "<br />"),
    idempotencyKey: `campaign:${campaign.id}:first-touch:${recipient}`,
  });
}
