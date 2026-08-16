import type { Prospect, ProspectingRequest } from "./types";

export const prospectingRequests: ProspectingRequest[] = [
  {
    id: "req-edtech-nigeria",
    name: "Nigerian education technology prospects",
    service: "Product Strategy & Development",
    geography: "Nigeria",
    industries: ["Education", "Education Technology"],
    organisationType: "Schools and education organisations",
    notes: "Prioritise organisations showing evidence of digital transformation or new technology initiatives.",
    status: "completed",
    createdAt: "2026-08-16T10:00:00Z",
  },
];

export const prospects: Prospect[] = [
  {
    id: "prospect-001",
    requestId: "req-edtech-nigeria",
    organisationName: "Example Education Group",
    industry: "Education",
    geography: "Nigeria",
    description: "Development record representing a potential education organisation.",
    likelyNeed: "Digital product strategy and technology delivery.",
    recommendedService: "Product Strategy & Development",
    decisionMakerRole: "Founder / Chief Executive Officer (CEO)",
    score: 88,
    confidence: 74,
    status: "review",
    evidence: [
      { claim: "Organisation operates in the target education segment.", source: "Development dataset", sourceType: "verified" },
      { claim: "Digital product support may be relevant based on the target criteria.", source: "ARIA assessment", sourceType: "inference" },
    ],
    createdAt: "2026-08-16T10:20:00Z",
    updatedAt: "2026-08-16T10:20:00Z",
  },
];
