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

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

const stageOrder: LeadStage[] = [
  "new",
  "researching",
  "qualified",
  "outreach_ready",
  "contacted",
  "engaged",
  "opportunity",
  "won",
];

function validateStageTransition(current: LeadRow, target: LeadStage) {
  const rule = getLeadStageRule(target);
  if (!rule) return "invalid_status";

  if (target === current.status) return null;

  if (target === "researching" && !current.service_interest && !current.problem_summary) {
    return "research_required_before_researching";
  }

  if (target === "qualified" && (current.score === null || current.score < 1)) {
    return "score_required_before_qualification";
  }

  if (target === "outreach_ready" && (!current.service_interest || !current.problem_summary)) {
    return "service_and_problem_required_before_outreach";
  }

  if (target === "opportunity" && !current.service_interest) {
    return "service_required_before_opportunity";
  }

  if (target === "won" && current.status !== "opportunity" && current.status !== "engaged") {
    return "opportunity_required_before_won";
  }

  if (target === "lost" && ![...stageOrder, "nurture"].includes(current.status as LeadStage)) {
    return "invalid_loss_transition";
  }

  return null;
}

export async function createLead(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const organisationId = String(formData.get("organisation_id") ?? "").trim();
  const serviceInterest = String(formData.get("service_interest") ?? "").trim() || null;
  const problemSummary = String(formData.get("problem_summary") ?? "").trim() || null;
  const scoreValue = Number(formData.get("score"));
  const score = Number.isFinite(scoreValue) ? Math.min(100, Math.max(0, Math.round(scoreValue))) : null;

  if (!organisationId) redirect("/leads?error=organisation_required");

  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/leads?error=not_authorized");

  const leadPayload: LeadInsert = {
    organisation_id: organisationId,
    service_interest: serviceInterest,
    problem_summary: problemSummary,
    score,
    status: "new",
    source: "manual",
  };

  const leadsTable = supabase.from("leads") as any;
  const { data: lead, error } = await leadsTable
    .insert(leadPayload)
    .select("id")
    .single();

  if (error || !lead) redirect(`/leads?error=${encodeURIComponent(error?.message ?? "lead_create_failed")}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "lead_created",
    entity_type: "lead",
    entity_id: lead.id,
    metadata: { source: "manual", stage: "new" },
  };
  await (supabase.from("audit_events") as any).insert(auditPayload);

  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads?created=1");
}

export async function updateLeadStatus(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!leadId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) redirect("/leads?error=invalid_status");

  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/leads?error=not_authorized");

  const { data: current, error: loadError } = await (supabase.from("leads") as any)
    .select("id, organisation_id, prospect_id, status, service_interest, problem_summary, score, source, created_at, updated_at")
    .eq("id", leadId)
    .single();

  if (loadError || !current) redirect(`/leads?error=${encodeURIComponent(loadError?.message ?? "lead_not_found")}`);

  const validationError = validateStageTransition(current as LeadRow, status as LeadStage);
  if (validationError) redirect(`/leads?error=${validationError}`);

  const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", leadId);
  if (error) redirect(`/leads?error=${encodeURIComponent(error.message)}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "lead_status_updated",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { from_status: current.status, status, stage_rule: getLeadStageRule(status) },
  };
  await (supabase.from("audit_events") as any).insert(auditPayload);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  redirect("/leads?updated=1");
}
