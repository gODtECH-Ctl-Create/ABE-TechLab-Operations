import { NextResponse } from "next/server";
import { handleAssistantMessage, isAssistantChannel, type AssistantChannel } from "@/lib/assistant/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function authorized(request: Request) {
  const secret = process.env.ASSISTANT_WEBSITE_SECRET || process.env.WEBSITE_INTAKE_SECRET;
  return Boolean(secret && request.headers.get("x-assistant-secret") === secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leadId = new URL(request.url).searchParams.get("lead_id")?.trim();
  if (!leadId) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  try {
    const db = createSupabaseServiceClient() as any;
    const { data: conversation } = await db.from("assistant_conversations").select("id,lead_id,channel,status,ai_enabled,workflow_id,current_step_id,last_message_at,created_at").eq("lead_id", leadId).maybeSingle();
    if (!conversation) return NextResponse.json({ ok: true, conversation: null, messages: [] });
    const { data: messages, error } = await db.from("assistant_messages").select("id,sender_type,content,message_type,created_at,metadata").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, conversation, messages: messages ?? [] });
  } catch (error) {
    console.error("Assistant conversation load failed", error);
    return NextResponse.json({ error: "Unable to load conversation" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const leadId = String(body.lead_id ?? "").trim();
    const message = String(body.message ?? "").trim();
    const rawChannel = String(body.channel ?? "website_chat").trim();
    const channel: AssistantChannel = isAssistantChannel(rawChannel) ? rawChannel : "website_chat";
    if (!leadId) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    const result = await handleAssistantMessage({ leadId, channel, message: message || undefined, providerRequestId: String(body.request_id ?? "") || undefined });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Assistant chat request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process assistant message" }, { status: 500 });
  }
}
