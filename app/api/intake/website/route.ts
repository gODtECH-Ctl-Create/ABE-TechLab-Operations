import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ensureChannelConversation } from "@/lib/assistant/runtime";
import { startEmailFollowUp, startVoiceFollowUp } from "@/lib/assistant/channels";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TEXT_LENGTH = 200;
const ALLOWED_CHANNELS = ["website_chat", "whatsapp", "voice_call", "email"] as const;
type PreferredContactChannel = typeof ALLOWED_CHANNELS[number];

function text(value: unknown, max = MAX_TEXT_LENGTH) { return String(value ?? "").trim().slice(0, max); }
function splitName(value: string) { const parts = value.split(/\s+/).filter(Boolean); return { firstName: parts[0] || value, lastName: parts.slice(1).join(" ") || null }; }

export async function POST(request: Request) {
  const expectedSecret = process.env.WEBSITE_INTAKE_SECRET;
  const receivedSecret = request.headers.get("x-website-intake-secret");
  const intakeId = request.headers.get("x-website-intake-id") || "unknown";
  const requestId = crypto.randomUUID();
  if (!expectedSecret || receivedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
  try {
    const body = await request.json();
    const payloadIntakeId = text(body.intake_id, 100) || intakeId;
    const name = text(body.name);
    const email = text(body.email, 320).toLowerCase();
    const phone = text(body.phone, 50);
    const company = text(body.company);
    const need = text(body.need);
    const timeline = text(body.timeline);
    const message = text(body.message, MAX_MESSAGE_LENGTH);
    const rawPreferredChannel = text(body.preferred_channel, 50);
    const preferredChannel = (ALLOWED_CHANNELS as readonly string[]).includes(rawPreferredChannel) ? rawPreferredChannel as PreferredContactChannel : "website_chat";
    if (!payloadIntakeId || !name || !EMAIL_RE.test(email) || !need || !message) return NextResponse.json({ error: "Invalid intake payload", request_id: requestId }, { status: 400 });
    if ((preferredChannel === "whatsapp" || preferredChannel === "voice_call") && !phone) return NextResponse.json({ error: "A phone number is required for WhatsApp or phone follow-up.", request_id: requestId }, { status: 400 });

    const supabase = createSupabaseServiceClient();
    const db = supabase as any;
    const { data: duplicate } = await db.from("audit_events").select("id").eq("action", "website_lead_intake").contains("metadata", { intake_id: payloadIntakeId }).limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true, request_id: requestId });

    const organisationName = company || `${name} (Website enquiry)`;
    const { data: existingOrganisation, error: organisationLookupError } = await db.from("organisations").select("id,name").eq("name", organisationName).limit(1).maybeSingle();
    if (organisationLookupError) return NextResponse.json({ error: "Could not process organisation", request_id: requestId }, { status: 500 });
    let organisationId = existingOrganisation?.id as string | undefined;
    if (!organisationId) {
      const { data: organisation, error: organisationCreateError } = await db.from("organisations").insert({ name: organisationName, geography: null, industry: null, website_url: null }).select("id").single();
      if (organisationCreateError || !organisation) return NextResponse.json({ error: "Could not create organisation", request_id: requestId }, { status: 500 });
      organisationId = organisation.id;
    }

    const { firstName, lastName } = splitName(name);
    const { data: existingContact } = await db.from("contacts").select("id").eq("organisation_id", organisationId).eq("email", email).is("deleted_at", null).limit(1).maybeSingle();
    if (existingContact?.id) await db.from("contacts").update({ first_name: firstName, last_name: lastName, phone: phone || null, updated_at: new Date().toISOString() }).eq("id", existingContact.id);
    else { const { error: contactError } = await db.from("contacts").insert({ organisation_id: organisationId, first_name: firstName, last_name: lastName, email, phone: phone || null, is_decision_maker: false, notes: "Website enquiry contact" }); if (contactError) console.error("Website intake contact creation failed", { requestId, error: contactError }); }

    const problemSummary = [message, timeline ? `Timeline: ${timeline}` : ""].filter(Boolean).join("\n\n");
    const { data: lead, error: leadError } = await db.from("leads").insert({ organisation_id: organisationId, service_interest: need, problem_summary: problemSummary, status: "new", source: "website", score: null, preferred_contact_channel: preferredChannel }).select("id").single();
    if (leadError || !lead) return NextResponse.json({ error: "Could not create lead", request_id: requestId }, { status: 500 });

    await db.from("audit_events").insert({ actor_type: "website", actor_id: null, action: "website_lead_intake", entity_type: "lead", entity_id: lead.id, metadata: { intake_id: payloadIntakeId, source: "website", name, email, phone: phone || null, company: company || null, need, timeline: timeline || null, preferred_channel: preferredChannel } });

    let assistant: Record<string, unknown> = { started: false, reason: "not_required" };
    try {
      if (preferredChannel === "email") assistant = await startEmailFollowUp(lead.id);
      else if (preferredChannel === "voice_call") assistant = await startVoiceFollowUp(lead.id);
      else { const conversation = await ensureChannelConversation(lead.id, preferredChannel); assistant = { started: true, conversationId: conversation.id }; }
    } catch (error) { assistant = { started: false, reason: "channel_start_failed" }; console.error("Assistant channel start failed", { requestId, leadId: lead.id, preferredChannel, error }); }

    return NextResponse.json({ ok: true, lead_id: lead.id, request_id: requestId, preferred_channel: preferredChannel, assistant });
  } catch (error) {
    console.error("Website intake failed", { requestId, intakeId, error });
    return NextResponse.json({ error: "Unable to process website intake", request_id: requestId }, { status: 500 });
  }
}
