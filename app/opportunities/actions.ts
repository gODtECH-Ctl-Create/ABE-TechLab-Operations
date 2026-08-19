"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

const stages = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;

type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/opportunities?error=not_authorized");
  return { supabase, user };
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

  if (!organisationId || !name || !stages.includes(stage as (typeof stages)[number])) redirect("/opportunities?error=required_fields");
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
    owner_id: user.id,
    source: "manual",
  };

  const opportunitiesTable = supabase.from("opportunities") as any;
  const { data: opportunity, error } = await opportunitiesTable
    .insert(opportunityPayload)
    .select("id")
    .single();

  if (error || !opportunity) redirect(`/opportunities?error=${encodeURIComponent(error?.message ?? "opportunity_create_failed")}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "opportunity_created",
    entity_type: "opportunity",
    entity_id: opportunity.id,
    metadata: { source: "manual", stage },
  };
  await (supabase.from("audit_events") as any).insert(auditPayload);

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities?created=1");
}

export async function updateOpportunityStage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("opportunity_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stages.includes(stage as (typeof stages)[number])) redirect("/opportunities?error=invalid_stage");

  const opportunitiesTable = supabase.from("opportunities") as any;
  const { error } = await opportunitiesTable.update({ stage }).eq("id", id);
  if (error) redirect(`/opportunities?error=${encodeURIComponent(error.message)}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "opportunity_stage_updated",
    entity_type: "opportunity",
    entity_id: id,
    metadata: { stage },
  };
  await (supabase.from("audit_events") as any).insert(auditPayload);

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities?updated=1");
}
