"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import type { Database } from "../../lib/data/supabase/database.types";

type Role = "admin" | "operator" | "reviewer";
type ResearchRequestInsert = Database["public"]["Tables"]["research_requests"]["Insert"];
type AuditEventInsert = Database["public"]["Tables"]["audit_events"]["Insert"];

export async function createResearchRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : (roleResult.data as Role | null);
  if (!role || !["admin", "operator"].includes(role)) redirect("/prospecting?error=unauthorized");

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
    metadata: { query, geography, industries, requested_by_role: role },
  };
  await supabase.from("audit_events").insert(auditPayload as never);

  // Start the real research worker immediately. The worker is authenticated with
  // the same user's access token and performs web research, evidence capture,
  // qualification, lead creation and audit logging.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!accessToken || !supabaseUrl) {
    await supabase.from("research_requests").update({
      status: "failed",
      error_message: "Research worker configuration is unavailable.",
    } as never).eq("id", requestId);
    redirect("/prospecting?error=worker_configuration");
  }

  const workerResponse = await fetch(`${supabaseUrl}/functions/v1/research-prospects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestId }),
  });

  if (!workerResponse.ok) {
    const workerBody = await workerResponse.text().catch(() => "");
    await supabase.from("research_requests").update({
      status: "failed",
      error_message: workerBody.slice(0, 1000) || `Research worker returned ${workerResponse.status}`,
    } as never).eq("id", requestId);
    redirect(`/prospecting?error=${encodeURIComponent("research_worker_failed")}`);
  }

  revalidatePath("/prospecting");
  revalidatePath("/");
  redirect(`/prospecting?created=${requestId}`);
}
