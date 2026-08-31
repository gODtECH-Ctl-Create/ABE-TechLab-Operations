import { NextResponse } from "next/server";
import { getPublicChannelLinks } from "@/lib/assistant/channels";

function authorized(request: Request) {
  const secret = process.env.ASSISTANT_WEBSITE_SECRET || process.env.WEBSITE_INTAKE_SECRET;
  return Boolean(secret && request.headers.get("x-assistant-secret") === secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leadId = new URL(request.url).searchParams.get("lead_id")?.trim();
  if (!leadId) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await getPublicChannelLinks(leadId)) });
  } catch (error) {
    console.error("Assistant channel links failed", error);
    return NextResponse.json({ error: "Unable to resolve assistant channel links" }, { status: 500 });
  }
}
