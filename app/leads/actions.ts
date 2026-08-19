"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organisation_id: organisationId,
      service_interest: serviceInterest,
      problem_summary: problemSummary,
      score,
      status: "new",
      source: "manual",
    })
    .select("id")
    .single();

  if (error || !lead) redirect(`/leads?error=${encodeURIComponent(error?.message ?? "lead_create_failed")}`);

  await supabase.from("audit_events").insert({
    actor_type: "user",
    actor_id: user.id,
    action: "lead_created",
    entity_type: "lead",
    entity_id: lead.id,
    metadata: { source: "manual" },
  });

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

  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) redirect(`/leads?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_events").insert({
    actor_type: "user",
    actor_id: user.id,
    action: "lead_status_updated",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { status },
  });

  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads?updated=1");
}
