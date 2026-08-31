import { NextResponse } from "next/server";
import { handleAssistantMessage } from "@/lib/assistant/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function digits(value: string) { return value.replace(/\D/g, ""); }

async function findLeadByPhone(phone: string) {
  const db = createSupabaseServiceClient() as any;
  const { data: contacts } = await db.from("contacts").select("organisation_id,phone").not("phone", "is", null).is("deleted_at", null).limit(500);
  const target = digits(phone);
  const contact = (contacts ?? []).find((item: any) => digits(String(item.phone)) === target || digits(String(item.phone)).endsWith(target.slice(-10)) || target.endsWith(digits(String(item.phone)).slice(-10)));
  if (!contact) return null;
  const { data: leads } = await db.from("leads").select("id,status,created_at").eq("organisation_id", contact.organisation_id).order("created_at", { ascending: false }).limit(20);
  return (leads ?? []).find((item: any) => !["lost", "suppressed"].includes(item.status)) ?? null;
}

export async function POST(request: Request) {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  const received = request.headers.get("x-vapi-secret");
  if (expected && received !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await request.json();
    const event = payload?.message ?? payload;
    const type = String(event?.type ?? "");
    const call = event?.call ?? {};
    const customerNumber = String(call?.customer?.number ?? payload?.call?.customer?.number ?? "");
    const leadIdFromMetadata = String(call?.metadata?.lead_id ?? event?.metadata?.lead_id ?? "");
    let leadId = leadIdFromMetadata || null;
    if (!leadId && customerNumber) leadId = (await findLeadByPhone(customerNumber))?.id ?? null;
    if (!leadId) return NextResponse.json({ ok: true, ignored: true, reason: "lead_not_found" });

    const transcript = String(event?.transcript ?? event?.artifact?.transcript ?? "").trim();
    if ((type === "transcript" || type === "speech-update") && transcript) {
      await handleAssistantMessage({ leadId, channel: "voice_call", message: transcript, providerRequestId: String(call?.id ?? "") || undefined });
    }
    const db = createSupabaseServiceClient() as any;
    if (type === "call-ended" || type === "end-of-call-report") {
      const summary = event?.analysis?.summary ?? event?.artifact?.summary ?? null;
      await db.from("assistant_actions").insert({ conversation_id: null, lead_id: leadId, action_type: "voice_call_ended", tool_name: "vapi.webhook", input: { call_id: call?.id ?? null }, output: { summary }, status: "completed", completed_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Vapi assistant webhook failed", error);
    return NextResponse.json({ error: "Unable to process Vapi event" }, { status: 500 });
  }
}
