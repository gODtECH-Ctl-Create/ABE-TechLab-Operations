"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { SUPABASE_URL } from "../../lib/supabase/config";
import type { Database } from "../../lib/data/supabase/database.types";

type Role = "admin" | "operator" | "reviewer";
type ResearchRequestInsert = Database["public"]["Tables"]["research_requests"]["Insert"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type AuditEventInsert = Database["public"]["Tables"]["audit_events"]["Insert"];
type ProspectCandidate = Pick<Database["public"]["Tables"]["prospects"]["Row"], "id" | "organisation_id" | "status" | "likely_need" | "recommended_service" | "score">;

const AI_RESEARCH_ENABLED = process.env.AI_RESEARCH_ENABLED === "true";

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : (roleResult.data as Role | null);
  if (!role || !["admin", "operator"].includes(role)) redirect("/prospecting?error=unauthorized");
  return { supabase, user, role };
}

export async function createResearchRequest(formData: FormData) {
  const { supabase, user, role } = await requireOperator();

  const query = String(formData.get("query") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const industries = String(formData.get("industries") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!query) redirect("/prospecting?error=query_required");

  const requestPayload: ResearchRequestInsert = { query, geography, industries, status: "queued", provider: "aria" };
  const { data: request, error } = await supabase.from("research_requests").insert(requestPayload as never).select("id").single();
  const requestId = (request as { id: string } | null)?.id;
  if (error || !requestId) redirect(`/prospecting?error=${encodeURIComponent(error?.message ?? "request_failed")}`);

  const auditPayload: AuditEventInsert = {
    actor_type: "human",
    actor_id: user.id,
    action: "research.request_created",
    entity_type: "research_request",
    entity_id: requestId,
    metadata: { query, geography, industries, requested_by_role: role, ai_research_enabled: AI_RESEARCH_ENABLED },
  };
  await supabase.from("audit_events").insert(auditPayload as never);

  if (!AI_RESEARCH_ENABLED) {
    revalidatePath("/prospecting");
    revalidatePath("/ai");
    revalidatePath("/");
    redirect(`/prospecting?created=${requestId}&queued=1`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken || !SUPABASE_URL) {
    await supabase.from("research_requests").update({ status: "failed", error_message: "Research worker configuration is unavailable." } as never).eq("id", requestId);
    redirect("/prospecting?error=worker_configuration");
  }

  let workerFailure: string | null = null;
  try {
    const workerResponse = await fetch(`${SUPABASE_URL}/functions/v1/research-prospects-router`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
      cache: "no-store",
    });
    if (!workerResponse.ok) {
      const workerBody = await workerResponse.text().catch(() => "");
      workerFailure = workerBody.slice(0, 1000) || `Research worker returned ${workerResponse.status}`;
    }
  } catch (workerError) {
    workerFailure = workerError instanceof Error ? workerError.message : String(workerError);
  }

  if (workerFailure) {
    await supabase.from("research_requests").update({ status: "failed", error_message: workerFailure } as never).eq("id", requestId);
    redirect(`/prospecting?error=${encodeURIComponent("research_worker_failed")}`);
  }

  revalidatePath("/prospecting");
  revalidatePath("/ai");
  revalidatePath("/");
  redirect(`/prospecting?created=${requestId}`);
}

export async function convertProspectToLead(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const prospectId = String(formData.get("prospect_id") ?? "").trim();
  if (!prospectId) redirect("/prospecting?error=prospect_required");

  const { data: prospectData } = await supabase.from("prospects").select("id, organisation_id, status, likely_need, recommended_service, score").eq("id", prospectId).maybeSingle();
  const prospect = prospectData as ProspectCandidate | null;
  if (!prospect) redirect("/prospecting?error=prospect_not_found");

  const { data: existingLead } = await supabase.from("leads").select("id").eq("prospect_id", prospectId).maybeSingle();
  const existing = existingLead as { id: string } | null;
  if (existing?.id) redirect(`/leads/${existing.id}`);

  const leadPayload: LeadInsert = {
    organisation_id: prospect.organisation_id,
    prospect_id: prospect.id,
    status: "new",
    service_interest: prospect.recommended_service,
    problem_summary: prospect.likely_need,
    score: prospect.score,
    source: "prospect_research",
  };

  const { data: lead, error } = await supabase.from("leads").insert(leadPayload as never).select("id").single();
  if (error || !lead) redirect(`/prospecting/${prospectId}?error=${encodeURIComponent(error?.message ?? "lead_create_failed")}`);

  const createdLead = lead as { id: string };
  await supabase.from("prospects").update({ status: "converted" } as never).eq("id", prospectId);
  await supabase.from("audit_events").insert({
    actor_type: "human",
    actor_id: user.id,
    action: "prospect_converted_to_lead",
    entity_type: "prospect",
    entity_id: prospectId,
    metadata: { lead_id: createdLead.id, source: "prospect_research" },
  } as never);

  revalidatePath("/prospecting");
  revalidatePath(`/prospecting/${prospectId}`);
  revalidatePath("/leads");
  revalidatePath(`/leads/${createdLead.id}`);
  revalidatePath("/");
  redirect(`/leads/${createdLead.id}`);
}
