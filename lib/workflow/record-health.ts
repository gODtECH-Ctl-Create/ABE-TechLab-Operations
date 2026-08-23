export type RecordHealth = "healthy" | "overdue" | "stale" | "unassigned" | "needs_action";

const STALE_LEAD_DAYS = 7;
const STALE_OPPORTUNITY_DAYS = 14;

function ageInDays(value: string) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

export function getLeadHealth(record: { status: string; owner_id?: string | null; next_action?: string | null; next_action_due_at?: string | null; updated_at: string }): RecordHealth {
  if (["won", "lost", "nurture", "suppressed"].includes(record.status)) return "healthy";
  if (!record.owner_id) return "unassigned";
  if (!record.next_action) return "needs_action";
  if (record.next_action_due_at && new Date(record.next_action_due_at).getTime() < Date.now()) return "overdue";
  if (ageInDays(record.updated_at) >= STALE_LEAD_DAYS) return "stale";
  return "healthy";
}

export function getOpportunityHealth(record: { stage: string; owner_id?: string | null; next_action?: string | null; next_action_due_at?: string | null; expected_close_date?: string | null; updated_at: string }): RecordHealth {
  if (["won", "lost"].includes(record.stage)) return "healthy";
  if (!record.owner_id) return "unassigned";
  if (!record.next_action) return "needs_action";
  if (record.next_action_due_at && new Date(record.next_action_due_at).getTime() < Date.now()) return "overdue";
  if (record.expected_close_date && new Date(record.expected_close_date).getTime() < Date.now()) return "overdue";
  if (ageInDays(record.updated_at) >= STALE_OPPORTUNITY_DAYS) return "stale";
  return "healthy";
}

export const recordHealthLabels: Record<RecordHealth, string> = {
  healthy: "On track",
  overdue: "Overdue",
  stale: "Stale",
  unassigned: "Unassigned",
  needs_action: "Needs next action",
};
