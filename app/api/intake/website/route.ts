import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TEXT_LENGTH = 200;

function text(value: unknown, max = MAX_TEXT_LENGTH) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.WEBSITE_INTAKE_SECRET;
  const receivedSecret = request.headers.get("x-website-intake-secret");
  const intakeId = request.headers.get("x-website-intake-id") || "unknown";
  const requestId = crypto.randomUUID();

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    console.error("Website intake authentication failed", { requestId, intakeId, configured: Boolean(expectedSecret) });
    return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payloadIntakeId = text(body.intake_id, 100) || intakeId;
    const name = text(body.name);
    const email = text(body.email, 320).toLowerCase();
    const company = text(body.company);
    const need = text(body.need);
    const timeline = text(body.timeline);
    const message = text(body.message, MAX_MESSAGE_LENGTH);

    if (!payloadIntakeId || !name || !EMAIL_RE.test(email) || !need || !message) {
      return NextResponse.json({ error: "Invalid intake payload", request_id: requestId }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: duplicate, error: duplicateError } = await (supabase.from("audit_events") as any)
      .select("id")
      .eq("action", "website_lead_intake")
      .contains("metadata", { intake_id: payloadIntakeId })
      .limit(1)
      .maybeSingle();

    if (duplicateError) console.error("Website intake duplicate check failed", { requestId, intakeId: payloadIntakeId, error: duplicateError });
    if (duplicate) {
      console.info("Website intake duplicate accepted", { requestId, intakeId: payloadIntakeId });
      return NextResponse.json({ ok: true, duplicate: true, request_id: requestId });
    }

    const organisationName = company || `${name} (Website enquiry)`;

    const { data: existingOrganisation, error: organisationLookupError } = await (supabase.from("organisations") as any)
      .select("id,name")
      .eq("name", organisationName)
      .limit(1)
      .maybeSingle();

    if (organisationLookupError) {
      console.error("Website intake organisation lookup failed", { requestId, intakeId: payloadIntakeId, error: organisationLookupError });
      return NextResponse.json({ error: "Could not process organisation", request_id: requestId }, { status: 500 });
    }

    let organisationId = existingOrganisation?.id as string | undefined;

    if (!organisationId) {
      const { data: organisation, error: organisationCreateError } = await (supabase.from("organisations") as any)
        .insert({ name: organisationName, geography: null, industry: null, website_url: null })
        .select("id")
        .single();

      if (organisationCreateError || !organisation) {
        console.error("Website intake organisation creation failed", { requestId, intakeId: payloadIntakeId, error: organisationCreateError });
        return NextResponse.json({ error: "Could not create organisation", request_id: requestId }, { status: 500 });
      }

      organisationId = organisation.id;
    }

    const problemSummary = [message, timeline ? `Timeline: ${timeline}` : ""].filter(Boolean).join("\n\n");

    const { data: lead, error: leadError } = await (supabase.from("leads") as any)
      .insert({ organisation_id: organisationId, service_interest: need, problem_summary: problemSummary, status: "new", source: "website", score: null })
      .select("id")
      .single();

    if (leadError || !lead) {
      console.error("Website intake lead creation failed", { requestId, intakeId: payloadIntakeId, organisationId, error: leadError });
      return NextResponse.json({ error: "Could not create lead", request_id: requestId }, { status: 500 });
    }

    const { error: auditError } = await (supabase.from("audit_events") as any).insert({
      actor_type: "website",
      actor_id: null,
      action: "website_lead_intake",
      entity_type: "lead",
      entity_id: lead.id,
      metadata: { intake_id: payloadIntakeId, source: "website", name, email, company: company || null, need, timeline: timeline || null },
    });

    if (auditError) console.error("Website intake audit event failed", { requestId, intakeId: payloadIntakeId, leadId: lead.id, error: auditError });

    console.info("Website intake accepted", { requestId, intakeId: payloadIntakeId, leadId: lead.id, organisationId });
    return NextResponse.json({ ok: true, lead_id: lead.id, request_id: requestId });
  } catch (error) {
    console.error("Website intake failed", { requestId, intakeId, error });
    return NextResponse.json({ error: "Unable to process website intake", request_id: requestId }, { status: 500 });
  }
}
