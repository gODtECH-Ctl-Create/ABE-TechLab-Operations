"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type StrategyInsert = Database["public"]["Tables"]["outreach_strategies"]["Insert"];
type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
type MessageInsert = Database["public"]["Tables"]["campaign_messages"]["Insert"];

type Access = "admin" | "operator";

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/outreach?error=not_authorized");
  return { supabase, user, role: String(role) as Access };
}

export async function createStrategy(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const prospectId = String(formData.get("prospect_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim() || null;
  const persona = String(formData.get("persona") ?? "").trim() || null;
  const angle = String(formData.get("angle") ?? "").trim() || null;
  const valueProposition = String(formData.get("value_proposition") ?? "").trim() || null;
  const channel = String(formData.get("channel") ?? "email").trim();
  if (!prospectId || !objective || !channel) redirect("/outreach?error=strategy_required");

  const payload: StrategyInsert = { prospect_id: prospectId, lead_id: leadId, objective, service, persona, angle, value_proposition, channel, status: "needs_review", talking_points: [], sequence: [], messages: [], rationale: [] };
  const { data: strategy, error } = await (supabase.from("outreach_strategies") as any).insert(payload).select("id").single();
  if (error || !strategy) redirect(`/outreach?error=${encodeURIComponent(error?.message ?? "strategy_create_failed")}`);

  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: user.id, action: "outreach_strategy_created", entity_type: "outreach_strategy", entity_id: strategy.id, metadata: { source: "manual", channel } });
  revalidatePath("/outreach");
  redirect("/outreach?created=strategy");
}

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const strategyId = String(formData.get("strategy_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim() || null;
  const channel = String(formData.get("channel") ?? "email").trim();
  if (!strategyId || !channel) redirect("/outreach?error=campaign_required");
  const payload: CampaignInsert = { strategy_id: strategyId, lead_id: leadId, channel, status: "draft" };
  const { data: campaign, error } = await (supabase.from("campaigns") as any).insert(payload).select("id").single();
  if (error || !campaign) redirect(`/outreach?error=${encodeURIComponent(error?.message ?? "campaign_create_failed")}`);
  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: user.id, action: "campaign_created", entity_type: "campaign", entity_id: campaign.id, metadata: { source: "manual", channel } });
  revalidatePath("/outreach");
  redirect("/outreach?created=campaign");
}

export async function createCampaignMessage(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "first_touch").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  if (!campaignId || !body || !["first_touch", "follow_up_1", "follow_up_2"].includes(stage)) redirect("/outreach?error=message_required");
  const payload: MessageInsert = { campaign_id: campaignId, stage, subject, body, status: "draft" };
  const { data: message, error } = await (supabase.from("campaign_messages") as any).insert(payload).select("id").single();
  if (error || !message) redirect(`/outreach?error=${encodeURIComponent(error?.message ?? "message_create_failed")}`);
  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: user.id, action: "campaign_message_created", entity_type: "campaign_message", entity_id: message.id, metadata: { stage } });
  revalidatePath("/outreach");
  redirect("/outreach?created=message");
}

export async function updateCampaignStatus(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const id = String(formData.get("campaign_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const allowed = ["draft", "approved", "active", "paused", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) redirect("/outreach?error=invalid_campaign_status");
  const patch = status === "approved" ? { status, approved_at: new Date().toISOString(), approved_by: user.id } : { status };
  const { error } = await (supabase.from("campaigns") as any).update(patch).eq("id", id);
  if (error) redirect(`/outreach?error=${encodeURIComponent(error.message)}`);
  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: user.id, action: "campaign_status_updated", entity_type: "campaign", entity_id: id, metadata: { status } });
  revalidatePath("/outreach");
  redirect("/outreach?updated=1");
}
