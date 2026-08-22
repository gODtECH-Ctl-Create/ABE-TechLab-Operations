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

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const intakeId = text(body.intake_id, 100);
    const name = text(body.name);
    const email = text(body.email, 320).toLowerCase();
    const company = text(body.company);
    const need = text(body.need);
    const timeline = text(body.timeline);
    const message = text(body.message, MAX_MESSAGE_LENGTH);

    if (!intakeId || !name || !EMAIL_RE.test(email) || !need || !message) {
      return NextResponse.json({ error: "Invalid intake payload" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: duplicate } = await (supabase.from("audit_events") as any)
      .select("id")
      .eq("action", "website_lead_intake")
      .contains("metadata", { intake_id: intakeId })
      .limit(1)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const organisationName = company || `${name} (Website enquiry)`;

    const { data: existingOrganisation, error: organisationLookupError } = await (supabase.from("organisations") as any)
      .select("id,name")
      .eq("name", organisationName)
      .limit(1)
      .maybeSingle();

    if (organisationLookupError) {
      console.error("Website intake organisation lookup failed:", organisationLookupError);
      return NextResponse.json({ error: "Could not process organisation" }, { status: 500 });
    }

    let organisationId = existingOrganisation?.id as string | undefined;

    if (!organisationId) {
      const { data: organisation, error: organisationCreateError } = await (supabase.from("organisations") as any)
        .insert({
          name: organisationName,
          geography: null,
          industry: null,
          website_url: null,
        })
        .select("id")
        .single();

      if (organisationCreateError || !organisation) {
        console.error("Website intake organisation creation failed:", organisationCreateError);
        return NextResponse.json({ error: "Could not create organisation" }, { status: 500 });
      }

      organisationId = organisation.id;
    }

    const problemSummary = [message, timeline ? `Timeline: ${timeline}` : ""].filter(Boolean).join("\n\n");

    const { data: lead, error: leadError } = await (supabase.from("leads") as any)
      .insert({
        organisation_id: organisationId,
        service_interest: need,
        problem_summary: problemSummary,
        status: "new",
        source: "website",
        score: null,
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      console.error("Website intake lead creation failed:", leadError);
      return NextResponse.json({ error: "Could not create lead" }, { status: 500 });
    }

    const { error: auditError } = await (supabase.from("audit_events") as any).insert({
      actor_type: "website",
      actor_id: null,
      action: "website_lead_intake",
      entity_type: "lead",
      entity_id: lead.id,
      metadata: {
        intake_id: intakeId,
        source: "website",
        name,
        email,
        company: company || null,
        need,
        timeline: timeline || null,
      },
    });

    if (auditError) {
      console.error("Website intake audit event failed:", auditError);
    }

    return NextResponse.json({ ok: true, lead_id: lead.id });
  } catch (error) {
    console.error("Website intake failed:", error);
    return NextResponse.json({ error: "Unable to process website intake" }, { status: 500 });
  }
}
