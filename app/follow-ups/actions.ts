"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/follow-ups?error=unauthorized");
  return { supabase, user };
}

export async function createFollowUp(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const messageId = String(formData.get("campaign_message_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const scheduledFor = String(formData.get("scheduled_for") ?? "").trim();
  if (!messageId || !leadId || !scheduledFor) redirect("/follow-ups?error=required");

  const { error } = await supabase.from("follow_ups").insert({ campaign_message_id: messageId, lead_id: leadId, scheduled_for: new Date(scheduledFor).toISOString(), status: "pending" } as never);
  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_events").insert({ actor_type: "human", actor_id: user.id, action: "follow_up.created", entity_type: "follow_up", metadata: { lead_id: leadId, campaign_message_id: messageId, scheduled_for: scheduledFor } } as never);
  revalidatePath("/follow-ups");
  revalidatePath("/");
  redirect("/follow-ups?created=1");
}

export async function updateFollowUpStatus(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["pending", "eligible", "sent", "cancelled", "blocked"].includes(status)) redirect("/follow-ups?error=invalid_action");

  const { error } = await supabase.from("follow_ups").update({ status, blocked_reason: status === "blocked" ? "Blocked by human review." : null } as never).eq("id", id);
  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_events").insert({ actor_type: "human", actor_id: user.id, action: "follow_up.status_changed", entity_type: "follow_up", entity_id: id, metadata: { status } } as never);
  revalidatePath("/follow-ups");
  revalidatePath("/");
  redirect("/follow-ups?updated=1");
}
