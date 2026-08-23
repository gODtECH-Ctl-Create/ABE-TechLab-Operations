"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLeadStageRule, type LeadStage } from "@/lib/workflow/stage-rules";
import type { Database } from "@/lib/data/supabase/database.types";

const allowedStatuses = [
  "new",
  "researching",
  "qualified",
  "outreach_ready",
  "contacted",
  "engaged",
  "opportunity",
  "won",
  "lost",
  "nurture",
] as const;

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/leads?error=not_authorized");
  return { supabase, user };
}

function validateStageTransition(current: LeadRow, target: LeadStage) {
  const rule = getLeadStageRule(target);
  if (!rule || target === current.status) return null;
  if (target === "researching" && !current.service_interest && !current.problem_summary) return "research_required_before_researching";
  if (target === "qualified" && (current.score === null || current.score < 1)) return "score_required_before_qualification";
  if (target === "outreach_ready" && (!current.service_interest || !current.problem_summary)) return "service_and_problem_required_before_outreach";
  if (target === "opportunity" && !current.service_interest) return "service_required_before_opportunity";
  if (target === "won" && !["opportunity", "engaged"].includes(current.status)) return "opportunity_required_before_won";
  if (target === "lost" && !["new","researching","qualified","outreach_ready","contacted","engaged","opportunity","nurture"].includes(current.status as LeadStage)) return "invalid_loss_transition";
  return null;
}

async function getCurrentLead(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, leadId: string) {
  const { data, error } = await (supabase.from("leads") as any)
    .select("id, organisation_id, prospect_id, status, service_interest, problem_summary, score, source, owner_id, next_action, next_action_due_at, created_at, updated_at")
    .eq("id", leadId)
    .single();
  if (error || !data) redirect(`/leads/${leadId}?error=lead_not_found`);
  return data as LeadRow;
}

export async function updateLead(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  if (!leadId) redirect("/leads?error=invalid_input");

  const current = await getCurrentLead(supabase, leadId);
  const serviceInterest = String(formData.get("service_interest") ?? "").trim() || null;
  const problemSummary = String(formData.get("problem_summary") ?? "").trim() || null;
  const scoreRaw = Number(formData.get("score"));
  const score = Number.isFinite(scoreRaw) ? Math.min(100, Math.max(0, Math.round(scoreRaw))) : null;
  const status = String(formData.get("status") ?? current.status);
  const ownerId = String(formData.get("owner_id") ?? "").trim() || null;
  const nextAction = String(formData.get("next_action") ?? "").trim() || null;
  const nextActionDueAt = String(formData.get("next_action_due_at") ?? "").trim() || null;

  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) redirect(`/leads/${leadId}?error=invalid_input`);
  const validationError = validateStageTransition({ ...current, service_interest: serviceInterest, problem_summary: problemSummary, score }, status as LeadStage);
  if (validationError) redirect(`/leads/${leadId}?error=${validationError}`);

  const targetRule = getLeadStageRule(status);
  if (targetRule?.requiredNextAction && (!nextAction || !nextActionDueAt)) redirect(`/leads/${leadId}?error=next_action_required`);
  if (targetRule?.requiredOwner && !ownerId) redirect(`/leads/${leadId}?error=owner_required`);

  const payload: LeadUpdate = { service_interest: serviceInterest, problem_summary: problemSummary, score, status, owner_id: ownerId, next_action: nextAction, next_action_due_at: nextActionDueAt };
  const { error } = await (supabase.from("leads") as any).update(payload).eq("id", leadId);
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "lead_updated",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { service_interest: serviceInterest, problem_summary: problemSummary, score, status, owner_id: ownerId, next_action: nextAction, next_action_due_at: nextActionDueAt },
  };
  await (supabase.from("audit_events") as any).insert(auditPayload);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  redirect(`/leads/${leadId}?updated=1`);
}

export async function updateLeadStatusFromDetail(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!leadId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) redirect(`/leads/${leadId}?error=invalid_status`);
  const current = await getCurrentLead(supabase, leadId);
  const validationError = validateStageTransition(current, status as LeadStage);
  if (validationError) redirect(`/leads/${leadId}?error=${validationError}`);
  const rule = getLeadStageRule(status);
  if (rule?.requiredNextAction && (!current.next_action || !current.next_action_due_at)) redirect(`/leads/${leadId}?error=next_action_required`);
  if (rule?.requiredOwner && !current.owner_id) redirect(`/leads/${leadId}?error=owner_required`);

  const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", leadId);
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  await (supabase.from("audit_events") as any).insert({ actor_type: "user", actor_id: user.id, action: "lead_status_updated", entity_type: "lead", entity_id: leadId, metadata: { from_status: current.status, status } } satisfies AuditInsert);
  revalidatePath(`/leads/${leadId}`); revalidatePath("/leads"); revalidatePath("/");
  redirect(`/leads/${leadId}?updated=1`);
}
