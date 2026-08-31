import { NextResponse } from "next/server";
import { handleAssistantMessage, isAssistantChannel, type AssistantChannel } from "@/lib/assistant/runtime";

export async function POST(request: Request) {
  const expectedSecret = process.env.ASSISTANT_WEBSITE_SECRET || process.env.WEBSITE_INTAKE_SECRET;
  const receivedSecret = request.headers.get("x-assistant-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!expectedSecret || (receivedSecret !== expectedSecret && bearer !== expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
