import { prospects } from "./mock-data";
import { convertApprovedProspectToLead, reviewProspect } from "./review";

const prospect = prospects[0];

export const reviewTestCases = {
  approve: reviewProspect(prospect, "approve", "Strong service fit and sufficient research evidence."),
  reject: reviewProspect(prospect, "reject", "Insufficient evidence for current outreach priority."),
  approvedConversion: convertApprovedProspectToLead({ ...prospect, status: "approved" }),
};
