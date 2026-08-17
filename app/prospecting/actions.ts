"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

type Role = "admin" | "operator" | "reviewer";

export async function createResearchRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : (roleResult.data as Role | null);
  if (!role || !["admin", "operator"].includes(role)) {
    redirect("/prospecting?error=unauthorized");
  }

  const query = String(formData.get("query") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const industries = String(formData.get("industries") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!query) redirect("/prospecting?error=query_required");

  const { data: request, error } = await supabase
    .from("research_requests")
    .insert({ query, geography, industries, status: "queued", provider: "aria" })
    .select("id")
    .single();

  if (error || !request) {
    redirect(`/prospecting?error=${encodeURIComponent(error?.message ?? "request_failed")}`);
  }

  await supabase.from("audit_events").insert({
    actor_type: "human",
    actor_id: user.id,
    action: "research.request_created",
    entity_type: "research_request",
    entity_id: request.id,
    metadata: { query, geography, industries, requested_by_role: role },
  });

  revalidatePath("/prospecting");
  revalidatePath("/");
  redirect(`/prospecting?created=${request.id}`);
}
