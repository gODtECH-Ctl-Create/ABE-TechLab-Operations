export type ProspectStatus = "discovered" | "researching" | "review" | "approved" | "rejected" | "converted";

export interface ProspectingRequest {
  id: string;
  name: string;
  service: string;
  geography: string;
  industries: string[];
  organisationType?: string;
  notes?: string;
  status: "draft" | "running" | "completed";
  createdAt: string;
}

export interface ProspectEvidence {
  claim: string;
  source: string;
  sourceType: "verified" | "inference";
}

export interface Prospect {
  id: string;
  requestId: string;
  organisationName: string;
  website?: string;
  industry?: string;
  geography?: string;
  description?: string;
  likelyNeed?: string;
  recommendedService?: string;
  decisionMakerRole?: string;
  score?: number;
  confidence?: number;
  status: ProspectStatus;
  evidence: ProspectEvidence[];
  createdAt: string;
  updatedAt: string;
}
