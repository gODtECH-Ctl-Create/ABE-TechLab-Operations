"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/leads?error=not_authorized");
  return { supabase, user };
}

export async function updateLead(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const serviceInterest = String(formData.get("service_interest") ?? "").trim() || null;
  const problemSummary = String(formData.get("problem_summary") ?? "").trim() || null;
  const scoreRaw = Number(formData.get("score"));
  const score = Number.isFinite(scoreRaw) ? Math.min(100, Math.max(0, Math.round(scoreRaw))) : null;
  const status = String(formData.get("status") ?? "new");

  if (!leadId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) redirect(`/leads/${leadId || ""}?error=invalid_input`);

  const payload: LeadUpdate = { service_interest: serviceInterest, problem_summary: problemSummary, score, status };
  const { error } = await (supabase.from("leads") as any).update(payload).eq("id", leadId);
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  const auditPayload: AuditInsert = {
    actor_type: "user",
    actor_id: user.id,
    action: "lead_updated",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { service_interest: serviceInterest, problem_summary: problemSummary, score, status },
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

  const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", leadId);
  if (error) redirect(`/leads/${leadId}?error=${encodeURIComponent(error.message)}`);

  await (supabase.from("audit_events") as any).insert({
    actor_type: "user",
    actor_id: user.id,
    action: "lead_status_updated",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { status },
  } satisfies AuditInsert);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  redirect(`/leads/${leadId}?updated=1`);
}
