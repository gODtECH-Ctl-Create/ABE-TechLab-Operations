"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireReviewer() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/approval?error=not_authorized");
  return { supabase, user };
}

async function decide(table: "outreach_strategies" | "campaigns", id: string, status: string, action: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const patch = table === "campaigns" && status === "approved" ? { status, approved_at: new Date().toISOString(), approved_by: userId } : { status };
  const { error } = await (supabase.from(table) as any).update(patch).eq("id", id);
  if (error) redirect(`/approval?error=${encodeURIComponent(error.message)}`);
  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: userId, action, entity_type: table === "campaigns" ? "campaign" : "outreach_strategy", entity_id: id, metadata: { decision: status } });
}

export async function approveStrategy(formData: FormData) { const { user } = await requireReviewer(); const id = String(formData.get("id") ?? "").trim(); if (!id) redirect("/approval?error=missing_id"); await decide("outreach_strategies", id, "approved", "outreach_strategy_approved", user.id); revalidatePath("/approval"); revalidatePath("/outreach"); redirect("/approval?changed=1"); }
export async function rejectStrategy(formData: FormData) { const { user } = await requireReviewer(); const id = String(formData.get("id") ?? "").trim(); if (!id) redirect("/approval?error=missing_id"); await decide("outreach_strategies", id, "archived", "outreach_strategy_rejected", user.id); revalidatePath("/approval"); revalidatePath("/outreach"); redirect("/approval?changed=1"); }
export async function approveCampaign(formData: FormData) { const { user } = await requireReviewer(); const id = String(formData.get("id") ?? "").trim(); if (!id) redirect("/approval?error=missing_id"); await decide("campaigns", id, "approved", "campaign_approved", user.id); revalidatePath("/approval"); revalidatePath("/outreach"); redirect("/approval?changed=1"); }
export async function rejectCampaign(formData: FormData) { const { user } = await requireReviewer(); const id = String(formData.get("id") ?? "").trim(); if (!id) redirect("/approval?error=missing_id"); await decide("campaigns", id, "cancelled", "campaign_rejected", user.id); revalidatePath("/approval"); revalidatePath("/outreach"); redirect("/approval?changed=1"); }
