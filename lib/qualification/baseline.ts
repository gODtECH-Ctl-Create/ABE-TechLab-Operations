import type { QualificationInput, QualificationResult } from "./types";

const SERVICE_KEYWORDS: Record<string, string[]> = {
  "Product Strategy & Development": ["product", "digital", "technology", "platform", "development", "strategy"],
  "Product Strategy & Management": ["product", "strategy", "management", "technology", "health"],
  "Technology Development": ["technology", "software", "digital", "platform", "development"],
};

function keywordScore(input: QualificationInput) {
  const haystack = [input.industry, input.likelyNeed, input.recommendedService]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywords = Object.values(SERVICE_KEYWORDS).flat();
  const matches = keywords.filter((keyword) => haystack.includes(keyword));
  return Math.min(35, matches.length * 5);
}

export function qualifyLead(input: QualificationInput): QualificationResult {
  const evidenceScore = Math.min(30, input.evidence.filter((item) => item.sourceType === "verified").length * 15);
  const serviceScore = input.recommendedService ? 20 : 0;
  const marketScore = input.geography === "Nigeria" ? 10 : 5;
  const relevanceScore = keywordScore(input);

  const score = Math.min(100, Math.max(0, evidenceScore + serviceScore + marketScore + relevanceScore));
  const classification = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  const confidence = Math.min(95, 45 + evidenceScore + (input.recommendedService ? 15 : 0));
  const recommendedService = input.recommendedService ?? "Needs assessment";

  const reasons = [
    evidenceScore ? `${input.evidence.filter((item) => item.sourceType === "verified").length} verified research signal(s) found.` : "Limited verified evidence is currently available.",
    input.recommendedService ? `The research indicates a potential fit for ${recommendedService}.` : "A specific service fit has not yet been established.",
    input.geography === "Nigeria" ? "The organisation is within the current target geography." : "The organisation is outside the primary current geography.",
  ];

  return {
    score,
    classification,
    confidence,
    recommendedService,
    reasons,
    nextAction: classification === "high" ? "Review prospect and prepare an outreach strategy." : classification === "medium" ? "Research the organisation further before outreach." : "Nurture or reject unless stronger evidence appears.",
    source: "baseline",
    qualifiedAt: new Date().toISOString(),
  };
}
