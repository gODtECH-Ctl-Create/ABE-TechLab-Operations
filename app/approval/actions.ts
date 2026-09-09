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

async function decideAriaProposal(formData: FormData, status: "approved" | "rejected") {
  const { supabase, user } = await requireReviewer();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/approval?error=missing_id");
  const db = supabase as any;
  const { error } = await db.from("aria_action_proposals").update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  if (error) redirect(`/approval?error=${encodeURIComponent(error.message)}`);
  await db.from("audit_events").insert({ actor_type: "human", actor_id: user.id, action: `aria.proposal_${status}`, entity_type: "aria_action_proposal", entity_id: id, metadata: { decision: status } });
  revalidatePath("/approval");
  redirect("/approval?changed=1");
}

export async function approveAriaProposal(formData: FormData) { return decideAriaProposal(formData, "approved"); }
export async function rejectAriaProposal(formData: FormData) { return decideAriaProposal(formData, "rejected"); }
