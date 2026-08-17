import type { EmailEvent, FollowUpDecision } from "./events";

export interface SequenceStep {
  stage: "first_touch" | "follow_up_1" | "follow_up_2";
  delayDays: number;
}

export function decideFollowUp(
  events: EmailEvent[],
  sequence: SequenceStep[],
  now = new Date(),
): FollowUpDecision {
  if (events.some((event) => event.type === "received")) {
    return { eligible: false, reason: "A response was received. Stop automated follow-ups." };
  }

  if (events.some((event) => ["bounced", "complained", "unsubscribed"].includes(event.type))) {
    return { eligible: false, reason: "The recipient is suppressed because of a bounce, complaint, or unsubscribe event." };
  }

  const sentStages = events
    .filter((event) => event.type === "sent")
    .map((event) => event.messageId);

  if (!sentStages.length) {
    return { eligible: false, reason: "No first-touch message has been sent yet." };
  }

  const lastSent = events
    .filter((event) => event.type === "sent")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .at(-1);

  if (!lastSent) return { eligible: false, reason: "No send event found." };

  const sentAt = new Date(lastSent.occurredAt);
  const daysSinceSend = (now.getTime() - sentAt.getTime()) / 86_400_000;
  const nextStage = sequence.find(
    (step): boolean => step.stage !== "first_touch" && step.delayDays <= daysSinceSend,
  );

  if (!nextStage || nextStage.stage === "first_touch") {
    return { eligible: false, reason: "No follow-up step is due yet." };
  }

  return {
    eligible: true,
    reason: `The ${nextStage.stage} step is due based on the approved sequence timing.`,
    nextStage: nextStage.stage,
    dueAt: now.toISOString(),
  };
}
