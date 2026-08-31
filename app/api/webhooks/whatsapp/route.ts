import { NextResponse } from "next/server";
import { handleAssistantMessage } from "@/lib/assistant/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function digits(value: string) { return value.replace(/\D/g, ""); }

async function findLeadByPhone(phone: string) {
  const db = createSupabaseServiceClient() as any;
  const { data: contacts, error } = await db.from("contacts").select("organisation_id, phone").not("phone", "is", null).is("deleted_at", null).limit(500);
  if (error) throw error;
  const target = digits(phone);
  const contact = (contacts ?? []).find((item: any) => digits(String(item.phone)) === target || digits(String(item.phone)).endsWith(target.slice(-10)) || target.endsWith(digits(String(item.phone)).slice(-10)));
  if (!contact) return null;
  const { data: leads } = await db.from("leads").select("id,status,created_at").eq("organisation_id", contact.organisation_id).order("created_at", { ascending: false }).limit(20);
  return (leads ?? []).find((item: any) => !["lost", "suppressed"].includes(item.status)) ?? null;
}

async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION;
  if (!token || !phoneNumberId || !version) return false;
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }) });
  if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status}`);
  return true;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const message = payload?.entry?.flatMap((entry: any) => entry.changes ?? []).flatMap((change: any) => change.value?.messages ?? [])[0];
    if (!message || message.type !== "text") return NextResponse.json({ ok: true, ignored: true });
    const from = String(message.from ?? "");
    const text = String(message.text?.body ?? "").trim();
    if (!from || !text) return NextResponse.json({ ok: true, ignored: true });
    const lead = await findLeadByPhone(from);
    if (!lead) return NextResponse.json({ ok: true, ignored: true, reason: "unknown_sender" });
    const result = await handleAssistantMessage({ leadId: lead.id, channel: "whatsapp", message: text, providerRequestId: String(message.id ?? "") || undefined });
    const replySent = await sendWhatsAppMessage(from, result.message.content);
    return NextResponse.json({ ok: true, conversation_id: result.conversationId, reply_sent: replySent });
  } catch (error) {
    console.error("WhatsApp assistant webhook failed", error);
    return NextResponse.json({ error: "Unable to process WhatsApp message" }, { status: 500 });
  }
}
