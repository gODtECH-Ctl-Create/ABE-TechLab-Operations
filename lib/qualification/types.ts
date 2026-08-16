import type { ProspectEvidence } from "../prospecting/types";

export type FitClassification = "high" | "medium" | "low";
export type QualificationSource = "baseline" | "aria" | "human_override";

export interface QualificationInput {
  organisationName: string;
  industry?: string;
  geography?: string;
  likelyNeed?: string;
  recommendedService?: string;
  evidence: ProspectEvidence[];
  score?: number;
}

export interface QualificationResult {
  score: number;
  classification: FitClassification;
  confidence: number;
  recommendedService: string;
  reasons: string[];
  nextAction: string;
  source: QualificationSource;
  qualifiedAt: string;
}
