import { NextResponse } from "next/server";
import { handleAssistantMessage } from "@/lib/assistant/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

export async function POST(request: Request) {
  const expectedSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-resend-webhook-secret");
  if (expectedSecret && receivedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const event = await request.json();
    if (event?.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });
    const data = event.data ?? {};
    const sender = normalizeEmail(String(data.from ?? data.sender ?? ""));
    const body = String(data.text ?? data.text_body ?? data.html ?? "").replace(/<[^>]+>/g, " ").trim();
    if (!sender || !body) return NextResponse.json({ ok: true, ignored: true });

    const supabase = createSupabaseServiceClient();
    const db = supabase as any;
    const { data: contacts, error: contactError } = await db.from("contacts").select("id, organisation_id, email").eq("email", sender).is("deleted_at", null).limit(10);
    if (contactError) throw contactError;
    if (!contacts?.length) return NextResponse.json({ ok: true, ignored: true, reason: "unknown_sender" });

    const { data: leads, error: leadError } = await db.from("leads").select("id, organisation_id, status, created_at").in("organisation_id", contacts.map((contact: any) => contact.organisation_id)).order("created_at", { ascending: false }).limit(20);
    if (leadError) throw leadError;
    const lead = (leads ?? []).find((item: any) => !["lost", "suppressed"].includes(item.status));
    if (!lead) return NextResponse.json({ ok: true, ignored: true, reason: "no_active_lead" });

    const result = await handleAssistantMessage({ leadId: lead.id, channel: "email", message: body, providerRequestId: String(data.email_id ?? data.id ?? "") || undefined });
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return NextResponse.json({ ok: true, conversation_id: result.conversationId, reply_sent: false });
    const subject = String(data.subject ?? "Your ABE TechLab enquiry");
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [sender], subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`, text: result.message.content }), cache: "no-store" });
    if (!response.ok) throw new Error(`Resend reply returned ${response.status}`);
    return NextResponse.json({ ok: true, conversation_id: result.conversationId, reply_sent: true });
  } catch (error) {
    console.error("Inbound email assistant webhook failed", error);
    return NextResponse.json({ error: "Unable to process inbound email" }, { status: 500 });
  }
}
