export const proposalTypes = ["follow_up", "task", "opportunity_update", "outreach_strategy", "invoice_reminder"] as const;
export type ProposalType = typeof proposalTypes[number];
export type AriaProposal = { type: ProposalType; title: string; description: string; rationale?: string; targetLabel?: string };
export type AriaBrief = {
  executiveSummary: string;
  urgentItems: string[];
  commercialSignals: string[];
  pendingDecisions: string[];
  recommendations: Array<{ priority: number; title: string; reason: string; proposal?: AriaProposal }>;
  dataLimitations: string[];
};
export type AriaAnswer = { answer: string; proposal?: AriaProposal };

const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const clean = (value: unknown, max = 2000) => String(value ?? "").replace(uuidPattern, "internal record").trim().slice(0, max);
const list = (value: unknown, limit = 8) => Array.isArray(value) ? value.map((item) => clean(item, 500)).filter(Boolean).slice(0, limit) : [];

function jsonObject(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  for (const candidate of [fenced, raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)]) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch { /* try the next safe candidate */ }
  }
  throw new Error("ARIA returned an invalid response. Please retry.");
}

function proposal(value: unknown): AriaProposal | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const type = clean(item.type) as ProposalType;
  const title = clean(item.title, 160);
  const description = clean(item.description);
  if (!proposalTypes.includes(type) || title.length < 3 || description.length < 3) return undefined;
  return { type, title, description, rationale: clean(item.rationale, 1000) || undefined, targetLabel: clean(item.targetLabel, 160) || undefined };
}

export function parseAriaBrief(raw: string): AriaBrief {
  const value = jsonObject(raw);
  const recommendations = Array.isArray(value.recommendations) ? value.recommendations.slice(0, 3).map((entry, index) => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return { priority: index + 1, title: clean(item.title, 160), reason: clean(item.reason, 600), proposal: proposal(item.proposal) };
  }).filter((item) => item.title && item.reason) : [];
  const result = {
    executiveSummary: clean(value.executiveSummary, 1200), urgentItems: list(value.urgentItems),
    commercialSignals: list(value.commercialSignals), pendingDecisions: list(value.pendingDecisions),
    recommendations, dataLimitations: list(value.dataLimitations, 5),
  };
  if (!result.executiveSummary || !recommendations.length) throw new Error("ARIA returned an incomplete briefing. Please retry.");
  return result;
}

export function parseAriaAnswer(raw: string): AriaAnswer {
  const value = jsonObject(raw);
  const answer = clean(value.answer, 2500);
  if (!answer) throw new Error("ARIA returned an incomplete answer. Please retry.");
  return { answer, proposal: proposal(value.proposal) };
}
