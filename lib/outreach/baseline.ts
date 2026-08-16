import type { Prospect } from "../prospecting/types";
import type { OutreachStrategy } from "./types";

export function createBaselineOutreachStrategy(prospect: Prospect): OutreachStrategy {
  const service = prospect.recommendedService ?? "Product Strategy & Development";
  const persona = prospect.decisionMakerRole ?? "Founder / Chief Executive Officer (CEO)";
  const angle = prospect.likelyNeed
    ? `Explore whether ${prospect.likelyNeed.toLowerCase()} is currently a priority.`
    : `Explore current product and technology priorities where ${service.toLowerCase()} could help.`;
  const now = new Date().toISOString();

  return {
    id: `strategy-${prospect.id}`,
    prospectId: prospect.id,
    objective: "Start a relevant business conversation and validate the identified need.",
    service,
    persona,
    angle,
    valueProposition: `ABE TechLab can support organisations with ${service.toLowerCase()}, from strategy through delivery.`,
    talkingPoints: [
      "Lead with the prospect's likely need rather than a generic company introduction.",
      "Use only evidence-backed personalisation in the first message.",
      "Ask for a short conversation instead of pushing for a sale immediately.",
    ],
    channel: "email",
    sequence: [
      { stage: "first_touch", delayDays: 0 },
      { stage: "follow_up_1", delayDays: 4 },
      { stage: "follow_up_2", delayDays: 7 },
    ],
    messages: [
      {
        id: `message-${prospect.id}-1`,
        stage: "first_touch",
        subject: `A quick question about ${service.toLowerCase()}`,
        body: `Hi ${persona},\n\nI came across ${prospect.organisationName} and noticed an area that may be relevant to your current product and technology priorities. I wanted to ask whether this is something your team is currently exploring.\n\nIf it is, I'd be happy to share a few practical ideas from our work at ABE TechLab.\n\nBest,\nABE TechLab`,
        assumptions: [],
      },
      {
        id: `message-${prospect.id}-2`,
        stage: "follow_up_1",
        body: "Following up briefly on my earlier note. If this is a current priority, I can send a concise outline of how we could approach it.",
        assumptions: [],
      },
      {
        id: `message-${prospect.id}-3`,
        stage: "follow_up_2",
        body: "Closing the loop for now. If product or technology strategy becomes a priority, I'm happy to reconnect.",
        assumptions: [],
      },
    ],
    confidence: prospect.confidence ?? 50,
    rationale: [
      "Strategy is based on the prospect's recorded service fit and likely need.",
      "First-touch messaging intentionally avoids unsupported claims.",
    ],
    status: "needs_review",
    createdAt: now,
    updatedAt: now,
  };
}
