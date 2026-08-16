import type { Prospect, ProspectStatus } from "./types";

export type ReviewDecision = "approve" | "reject";

export interface ReviewEvent {
  prospectId: string;
  decision: ReviewDecision;
  reviewer: "human";
  reason?: string;
  createdAt: string;
}

export function reviewProspect(
  prospect: Prospect,
  decision: ReviewDecision,
  reason?: string,
): { prospect: Prospect; event: ReviewEvent } {
  const status: ProspectStatus = decision === "approve" ? "approved" : "rejected";
  const event: ReviewEvent = {
    prospectId: prospect.id,
    decision,
    reviewer: "human",
    reason,
    createdAt: new Date().toISOString(),
  };

  return {
    prospect: { ...prospect, status, updatedAt: event.createdAt },
    event,
  };
}

export function convertApprovedProspectToLead(prospect: Prospect) {
  if (prospect.status !== "approved") {
    throw new Error("Only an approved prospect can be converted into a lead.");
  }

  return {
    id: `lead-from-${prospect.id}`,
    organisationId: `org-from-${prospect.id}`,
    serviceInterest: prospect.recommendedService,
    status: "new" as const,
    score: prospect.score,
    problemSummary: prospect.likelyNeed,
    nextAction: "Create outreach strategy",
    source: "prospecting" as const,
  };
}
