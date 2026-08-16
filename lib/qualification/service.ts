import { qualifyLead } from "./baseline";
import type { QualificationResult } from "./types";
import type { Prospect } from "../prospecting/types";

export function qualifyProspect(prospect: Prospect): QualificationResult {
  return qualifyLead({
    organisationName: prospect.organisationName,
    industry: prospect.industry,
    geography: prospect.geography,
    likelyNeed: prospect.likelyNeed,
    recommendedService: prospect.recommendedService,
    evidence: prospect.evidence,
    score: prospect.score,
  });
}

export function qualificationSummary(prospects: Prospect[]) {
  return prospects.map((prospect) => ({
    prospectId: prospect.id,
    organisationName: prospect.organisationName,
    result: qualifyProspect(prospect),
  }));
}
