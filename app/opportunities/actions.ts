"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stages = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;

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

  const { data: opportunity, error } = await supabase.from("opportunities").insert({
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
  }).select("id").single();

  if (error || !opportunity) redirect(`/opportunities?error=${encodeURIComponent(error?.message ?? "opportunity_create_failed")}`);

  await supabase.from("audit_events").insert({
    actor_type: "user", actor_id: user.id, action: "opportunity_created", entity_type: "opportunity", entity_id: opportunity.id,
    metadata: { source: "manual", stage },
  });

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities?created=1");
}

export async function updateOpportunityStage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("opportunity_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stages.includes(stage as (typeof stages)[number])) redirect("/opportunities?error=invalid_stage");

  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) redirect(`/opportunities?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_events").insert({
    actor_type: "user", actor_id: user.id, action: "opportunity_stage_updated", entity_type: "opportunity", entity_id: id,
    metadata: { stage },
  });

  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect("/opportunities?updated=1");
}
