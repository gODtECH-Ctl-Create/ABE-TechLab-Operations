import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const MAX_TIMESTAMP_AGE_SECONDS = 300;

function verifyResendWebhook(payload: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");

  if (!id || !timestamp || !signatureHeader) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;

  const age = Math.abs(Date.now() / 1000 - timestampNumber);
  if (age > MAX_TIMESTAMP_AGE_SECONDS) return false;

  const signedContent = `${id}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedContent).digest("base64");

  return signatureHeader.split(" ").some((value) => {
    const encoded = value.startsWith("v1,") ? value.slice(3) : value;
    const actualBuffer = Buffer.from(encoded);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const valid = verifyResendWebhook(payload, request.headers, secret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventId = request.headers.get("svix-id");
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  // Persistence and idempotency storage will be connected to the Operations data layer next.
  // For now, acknowledge only after signature verification and JSON validation.
  return NextResponse.json({
    received: true,
    eventId,
    type: event.type ?? "unknown",
    createdAt: event.created_at ?? null,
  });
}
