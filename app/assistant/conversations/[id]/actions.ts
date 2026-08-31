"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function guard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role ?? ""))) throw new Error("Forbidden");
  return supabase as any;
}

export async function takeOverConversation(formData: FormData) {
  const id = String(formData.get("conversation_id") ?? "");
  if (!id) throw new Error("conversation_id is required");
  const supabase = await guard();
  const { data: conversation } = await supabase.from("assistant_conversations").select("lead_id").eq("id", id).single();
  if (!conversation) throw new Error("Conversation not found");
  const now = new Date().toISOString();
  await supabase.from("assistant_conversations").update({ ai_enabled: false, status: "human_active", updated_at: now }).eq("id", id);
  const { data: existing } = await supabase.from("assistant_handoffs").select("id").eq("conversation_id", id).eq("status", "open").limit(1).maybeSingle();
  if (existing?.id) await supabase.from("assistant_handoffs").update({ status: "accepted", accepted_at: now }).eq("id", existing.id);
  else await supabase.from("assistant_handoffs").insert({ conversation_id: id, lead_id: conversation.lead_id, reason: "human_requested", priority: "normal", status: "accepted", accepted_at: now });
  await supabase.from("audit_events").insert({ actor_type: "human", actor_id: null, action: "assistant_human_takeover", entity_type: "assistant_conversation", entity_id: id, metadata: { lead_id: conversation.lead_id } });
  revalidatePath(`/assistant/conversations/${id}`); revalidatePath("/assistant");
}

export async function returnToAssistant(formData: FormData) {
  const id = String(formData.get("conversation_id") ?? "");
  if (!id) throw new Error("conversation_id is required");
  const supabase = await guard();
  const now = new Date().toISOString();
  await supabase.from("assistant_conversations").update({ ai_enabled: true, status: "active", updated_at: now }).eq("id", id);
  await supabase.from("assistant_handoffs").update({ status: "resolved", resolved_at: now }).eq("conversation_id", id).in("status", ["open", "accepted"]);
  await supabase.from("audit_events").insert({ actor_type: "human", actor_id: null, action: "assistant_returned_to_ai", entity_type: "assistant_conversation", entity_id: id, metadata: {} });
  revalidatePath(`/assistant/conversations/${id}`); revalidatePath("/assistant");
}
