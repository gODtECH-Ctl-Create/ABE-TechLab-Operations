import type { OutreachStrategy } from "./types";

export type OutreachReviewDecision = "approve" | "reject" | "archive";

export interface OutreachReviewEvent {
  strategyId: string;
  decision: OutreachReviewDecision;
  reviewer: "human";
  reason?: string;
  createdAt: string;
}

export interface ApprovedCampaign {
  id: string;
  strategyId: string;
  channel: OutreachStrategy["channel"];
  messages: OutreachStrategy["messages"];
  sequence: OutreachStrategy["sequence"];
  approvedAt: string;
  approvedBy: "human";
  sendable: false;
}

export function reviewOutreachStrategy(
  strategy: OutreachStrategy,
  decision: OutreachReviewDecision,
  reason?: string,
) {
  const status = decision === "approve" ? "approved" : decision === "reject" ? "archived" : "archived";
  const event: OutreachReviewEvent = {
    strategyId: strategy.id,
    decision,
    reviewer: "human",
    reason,
    createdAt: new Date().toISOString(),
  };

  return { strategy: { ...strategy, status, updatedAt: event.createdAt }, event };
}

export function createApprovedCampaign(strategy: OutreachStrategy): ApprovedCampaign {
  if (strategy.status !== "approved") {
    throw new Error("Only a human-approved outreach strategy can become a campaign.");
  }

  return {
    id: `campaign-${strategy.id}`,
    strategyId: strategy.id,
    channel: strategy.channel,
    messages: strategy.messages,
    sequence: strategy.sequence,
    approvedAt: new Date().toISOString(),
    approvedBy: "human",
    sendable: false,
  };
}
