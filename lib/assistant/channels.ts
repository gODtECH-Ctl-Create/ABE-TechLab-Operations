import { ensureConversation, type AssistantChannel } from "@/lib/assistant/runtime";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Temporary public channel number while the dedicated WhatsApp/Vapi numbers are being provisioned.
// This is intentionally easy to remove once the real provider configuration is connected.
const TEMP_ASSISTANT_PHONE_NUMBER = "08140479738";

function phoneDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

async function getLeadContact(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const db = supabase as any;
  const { data: lead, error: leadError } = await db.from("leads").select("id, organisation_id").eq("id", leadId).single();
  if (leadError) throw leadError;
  const { data: contact, error: contactError } = await db.from("contacts").select("id, first_name, last_name, email, phone").eq("organisation_id", lead.organisation_id).is("deleted_at", null).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (contactError) throw contactError;
  return { lead, contact };
}

export async function startEmailFollowUp(leadId: string) {
  const supabase = createSupabaseServiceClient();
  const db = supabase as any;
  const { contact } = await getLeadContact(leadId);
  if (!contact?.email) return { started: false, reason: "missing_email" };
  const conversation = await ensureConversation(leadId, "email");
  const body = `Hi ${contact.first_name || "there"},\n\nThanks for contacting ABE TechLab. I'm the client assistant, and I can help guide you through the next steps.\n\nI already have the initial details from your enquiry. Reply to this email with any additional information or questions, and we’ll continue from there.\n\nABE TechLab`;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { started: false, reason: "resend_not_configured", conversationId: conversation.id };
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [contact.email], subject: "Your ABE TechLab enquiry", text: body }), cache: "no-store" });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${raw.slice(0, 300)}`);
  const result = raw ? JSON.parse(raw) : {};
  await db.from("assistant_messages").insert({ conversation_id: conversation.id, sender_type: "assistant", content: body, message_type: "email", provider_message_id: result.id ?? null, metadata: { channel: "email" } });
  await db.from("assistant_conversations").update({ status: "waiting_client", last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversation.id);
  return { started: true, conversationId: conversation.id, providerMessageId: result.id ?? null };
}

export async function startVoiceFollowUp(leadId: string) {
  const { contact } = await getLeadContact(leadId);
  if (!contact?.phone) return { started: false, reason: "missing_phone" };
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  if (!apiKey || !phoneNumberId || !assistantId) return { started: false, reason: "vapi_not_configured" };
  const response = await fetch("https://api.vapi.ai/call", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ assistantId, phoneNumberId, customer: { number: contact.phone, name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || undefined }, metadata: { lead_id: leadId } }) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Vapi returned ${response.status}: ${raw.slice(0, 300)}`);
  const result = raw ? JSON.parse(raw) : {};
  const conversation = await ensureConversation(leadId, "voice_call");
  const supabase = createSupabaseServiceClient();
  await (supabase as any).from("assistant_actions").insert({ conversation_id: conversation.id, lead_id: leadId, action_type: "voice_call_started", tool_name: "vapi.call", input: { phone: phoneDigits(contact.phone) }, output: { call_id: result.id ?? null }, status: "completed", completed_at: new Date().toISOString() });
  return { started: true, conversationId: conversation.id, callId: result.id ?? null };
}

export async function ensureChannelConversation(leadId: string, channel: AssistantChannel) {
  return ensureConversation(leadId, channel);
}

async function getWhatsAppNumber() {
  const direct = process.env.WHATSAPP_PUBLIC_PHONE_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT_NUMBER;
  if (direct) return phoneDigits(direct);

  // Temporary fallback until Meta WhatsApp Cloud API is provisioned.
  return phoneDigits(TEMP_ASSISTANT_PHONE_NUMBER);
}

async function getVoiceNumber() {
  const direct = process.env.VAPI_PUBLIC_PHONE_NUMBER;
  if (direct) return direct.trim();

  // Temporary fallback until the dedicated Vapi number is provisioned.
  return TEMP_ASSISTANT_PHONE_NUMBER;
}

export async function getPublicChannelLinks(leadId: string) {
  const [whatsappNumber, voiceNumber] = await Promise.all([getWhatsAppNumber(), getVoiceNumber()]);
  const whatsapp = whatsappNumber ? `https://wa.me/${whatsappNumber.startsWith("234") ? whatsappNumber : `234${whatsappNumber.replace(/^0+/, "")}`}?text=${encodeURIComponent(`Hi ABE TechLab Assistant. I'd like to continue my enquiry. Lead: ${leadId}`)}` : null;
  const call = voiceNumber ? `tel:${voiceNumber.startsWith("+") ? voiceNumber : `+234${voiceNumber.replace(/^0+/, "")}`}` : null;
  return { whatsapp, call, whatsappNumber: whatsappNumber || null, voiceNumber: voiceNumber || null };
}
