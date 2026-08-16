export type OutreachChannel = "email" | "linkedin" | "phone" | "referral";
export type OutreachStatus = "draft" | "needs_review" | "approved" | "archived";

export interface OutreachMessage {
  id: string;
  stage: "first_touch" | "follow_up_1" | "follow_up_2";
  subject?: string;
  body: string;
  assumptions: string[];
}

export interface OutreachStrategy {
  id: string;
  prospectId: string;
  objective: string;
  service: string;
  persona: string;
  angle: string;
  valueProposition: string;
  talkingPoints: string[];
  channel: OutreachChannel;
  sequence: { stage: OutreachMessage["stage"]; delayDays: number }[];
  messages: OutreachMessage[];
  confidence: number;
  rationale: string[];
  status: OutreachStatus;
  createdAt: string;
  updatedAt: string;
}
