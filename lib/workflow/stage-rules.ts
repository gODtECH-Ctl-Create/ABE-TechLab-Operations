export type LeadStage =
  | "new"
  | "researching"
  | "qualified"
  | "outreach_ready"
  | "contacted"
  | "engaged"
  | "opportunity"
  | "won"
  | "lost"
  | "nurture";

export type StageRule = {
  id: LeadStage;
  label: string;
  purpose: string;
  entryCriteria: string[];
  exitCriteria: string[];
  requiredNextAction: boolean;
  requiredOwner: boolean;
};

export const LEAD_STAGE_RULES: readonly StageRule[] = [
  {
    id: "new",
    label: "New",
    purpose: "A newly captured lead that has not yet been reviewed.",
    entryCriteria: ["Lead record exists", "Organisation is identified"],
    exitCriteria: ["Lead has been reviewed", "A research or qualification action is defined"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "researching",
    label: "Researching",
    purpose: "The team is validating the organisation, need, fit, and relevant contact.",
    entryCriteria: ["Research has started", "Reason for pursuing the lead is recorded"],
    exitCriteria: ["Enough evidence exists to classify the lead", "Qualification decision is recorded"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "qualified",
    label: "Qualified",
    purpose: "The lead has enough evidence to justify active business-development effort.",
    entryCriteria: ["Relevant problem or need identified", "Service fit is understood", "Lead is worth pursuing"],
    exitCriteria: ["Outreach objective and channel are defined", "Responsible owner is assigned"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "outreach_ready",
    label: "Outreach ready",
    purpose: "The lead is prepared for deliberate, approved outreach.",
    entryCriteria: ["Target contact or decision-maker identified where possible", "Outreach strategy exists", "Message is appropriate to the lead"],
    exitCriteria: ["Outreach has been approved where approval is required", "A send or contact action is scheduled"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "contacted",
    label: "Contacted",
    purpose: "ABE TechLab has made a documented first contact.",
    entryCriteria: ["At least one outreach attempt is recorded"],
    exitCriteria: ["Response is received, or follow-up is scheduled", "Outcome of the contact attempt is known"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "engaged",
    label: "Engaged",
    purpose: "The prospect has shown meaningful interest or entered an active conversation.",
    entryCriteria: ["Meaningful response, meeting, call, or other engagement is recorded"],
    exitCriteria: ["Commercial need is sufficiently clear for an opportunity", "Or the lead is moved to nurture/lost with a reason"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "opportunity",
    label: "Opportunity",
    purpose: "There is a credible commercial opportunity that should be actively progressed.",
    entryCriteria: ["Defined business need", "Potential project or engagement identified", "Opportunity record exists"],
    exitCriteria: ["Proposal/commercial step is complete", "Decision is known", "Or opportunity is explicitly lost/nurtured"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "won",
    label: "Won",
    purpose: "The commercial opportunity has been successfully converted.",
    entryCriteria: ["Client decision is confirmed", "Commercial handoff is ready"],
    exitCriteria: ["Handoff into delivery/post-sale lifecycle is recorded"],
    requiredNextAction: true,
    requiredOwner: true,
  },
  {
    id: "lost",
    label: "Lost",
    purpose: "The opportunity or lead is no longer active for a defined reason.",
    entryCriteria: ["A clear loss reason is recorded"],
    exitCriteria: ["No further active sales action unless explicitly reopened"],
    requiredNextAction: false,
    requiredOwner: false,
  },
  {
    id: "nurture",
    label: "Nurture",
    purpose: "The lead is not ready now but may become relevant later.",
    entryCriteria: ["Reason for delaying active pursuit is recorded", "Future trigger or review point is known"],
    exitCriteria: ["A future review/follow-up is scheduled", "Or lead is reactivated/lost"],
    requiredNextAction: true,
    requiredOwner: true,
  },
];

export const ACTIVE_LEAD_STAGES = LEAD_STAGE_RULES.filter(
  (stage) => !["won", "lost"].includes(stage.id),
);

export function getLeadStageRule(stage: string): StageRule | undefined {
  return LEAD_STAGE_RULES.find((rule) => rule.id === stage);
}

export function stageRequiresOperationalDiscipline(stage: string): boolean {
  const rule = getLeadStageRule(stage);
  return Boolean(rule?.requiredNextAction || rule?.requiredOwner);
}
