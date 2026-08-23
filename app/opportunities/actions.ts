"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

const stages = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;
type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];
type OpportunityUpdate = Database["public"]["Tables"]["opportunities"]["Update"];
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

type OpportunityStage = (typeof stages)[number];

const stageOrder: OpportunityStage[] = ["discovery", "qualification", "proposal", "negotiation", "won"];

function validateStageTransition(current: OpportunityStage, target: OpportunityStage) {
  if (current === target) return null;
  if (target === "qualification" && current !== "discovery") return "qualification_requires_discovery";
  if (target === "proposal" && !["qualification", "proposal", "negotiation"].includes(current)) return "proposal_requires_qualification";
  if (target === "negotiation" && !["proposal", "negotiation"].includes(current)) return "negotiation_requires_proposal";
  if (target === "won" && !["proposal", "negotiation"].includes(current)) return "won_requires_proposal_or_negotiation";
  if (!stageOrder.includes(target) && target !== "lost") return "invalid_stage";
  return null;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/opportunities?error=not_authorized");
  return { supabase, user };
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

export async function createOpportunity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const organisationId = String(formData.get("organisation_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const stage = String(formData.get("stage") ?? "discovery");
  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = valueRaw ? Number(valueRaw) : null;
  const probabilityRaw = String(formData.get("probability") ?? "").trim();
  const probability = probabilityRaw ? Math.min(100, Math.max(0, Math.round(Number(probabilityRaw)))) : null;
  const expectedCloseDate = String(formData.get("expected_close_date") ?? "").trim() || null;
  const nextAction = String(formData.get("next_action") ?? "").trim() || null;
  const nextActionDueAt = parseOptionalDate(formData.get("next_action_due_at"));
  const ownerId = String(formData.get("owner_id") ?? "").trim() || user.id;

  if (!organisationId || !name || !stages.includes(stage as OpportunityStage)) redirect("/opportunities?error=required_fields");
  if (value !== null && !Number.isFinite(value)) redirect("/opportunities?error=invalid_value");
  if (probability !== null && !Number.isFinite(probability)) redirect("/opportunities?error=invalid_probability");

  const opportunityPayload: OpportunityInsert = {
    organisation_id: organisationId,
    lead_id: leadId,
    name,
    description,
    stage,
    value,
    probability,
    expected_close_date: expectedCloseDate,
    owner_id: ownerId,
    next_action: nextAction,
    next_action_due_at: nextActionDueAt,
    source: "manual",
  };

  const opportunitiesTable = supabase.from("opportunities") as any;
  const { data: opportunity, error } = await opportunitiesTable.insert(opportunityPayload).select("id").single();
  if (error || !opportunity) redirect(`/opportunities?error=${encodeURIComponent(error?.message ?? "opportunity_create_failed")}`);

  await (supabase.from("audit_events") as any).insert({
    actor_type: "user", actor_id: user.id, action: "opportunity_created", entity_type: "opportunity", entity_id: opportunity.id,
    metadata: { source: "manual", stage, owner_id: ownerId, next_action: nextAction, next_action_due_at: nextActionDueAt },
  } satisfies AuditInsert);

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities?created=1");
}

export async function updateOpportunity(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("opportunity_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "discovery") as OpportunityStage;
  const nextAction = String(formData.get("next_action") ?? "").trim() || null;
  const nextActionDueAt = parseOptionalDate(formData.get("next_action_due_at"));
  const ownerId = String(formData.get("owner_id") ?? "").trim() || null;
  const valueRaw = String(formData.get("value") ?? "").trim();
  const probabilityRaw = String(formData.get("probability") ?? "").trim();

  if (!id || !stages.includes(stage)) redirect("/opportunities?error=invalid_input");
  const { data: current, error: loadError } = await (supabase.from("opportunities") as any).select("id,stage").eq("id", id).single();
  if (loadError || !current) redirect(`/opportunities?error=${encodeURIComponent(loadError?.message ?? "opportunity_not_found")}`);
  const transitionError = validateStageTransition(current.stage as OpportunityStage, stage);
  if (transitionError) redirect(`/opportunities/${id}?error=${transitionError}`);

  const value = valueRaw ? Number(valueRaw) : null;
  const probability = probabilityRaw ? Math.min(100, Math.max(0, Math.round(Number(probabilityRaw)))) : null;
  const payload: OpportunityUpdate = { stage, next_action: nextAction, next_action_due_at: nextActionDueAt, owner_id: ownerId, value, probability };
  const { error } = await (supabase.from("opportunities") as any).update(payload).eq("id", id);
  if (error) redirect(`/opportunities/${id}?error=${encodeURIComponent(error.message)}`);

  await (supabase.from("audit_events") as any).insert({
    actor_type: "user", actor_id: user.id, action: "opportunity_updated", entity_type: "opportunity", entity_id: id,
    metadata: { from_stage: current.stage, stage, owner_id: ownerId, next_action: nextAction, next_action_due_at: nextActionDueAt },
  } satisfies AuditInsert);

  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect(`/opportunities/${id}?updated=1`);
}

export async function updateOpportunityStage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("opportunity_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "") as OpportunityStage;
  if (!id || !stages.includes(stage)) redirect("/opportunities?error=invalid_stage");

  const opportunitiesTable = supabase.from("opportunities") as any;
  const { data: current, error: loadError } = await opportunitiesTable.select("stage").eq("id", id).single();
  if (loadError || !current) redirect(`/opportunities?error=${encodeURIComponent(loadError?.message ?? "opportunity_not_found")}`);
  const transitionError = validateStageTransition(current.stage as OpportunityStage, stage);
  if (transitionError) redirect(`/opportunities?error=${transitionError}`);

  const { error } = await opportunitiesTable.update({ stage }).eq("id", id);
  if (error) redirect(`/opportunities?error=${encodeURIComponent(error.message)}`);

  await (supabase.from("audit_events") as any).insert({
    actor_type: "user", actor_id: user.id, action: "opportunity_stage_updated", entity_type: "opportunity", entity_id: id,
    metadata: { from_stage: current.stage, stage },
  } satisfies AuditInsert);

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/");
  redirect("/opportunities?updated=1");
}
