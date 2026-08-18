import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const getSecret = (...names: string[]) => {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return "";
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clamp = (value: unknown) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const parseJson = (text: string) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Gemini returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase server configuration is incomplete" }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";

  if (!requestId) return json({ error: "requestId is required" }, 400);

  const { data: request, error: requestError } = await admin
    .from("research_requests")
    .select("id, query, geography, industries, status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) return json({ error: "Research request not found" }, 404);
  if (!["queued", "failed"].includes(request.status)) {
    return json({ error: `Research request is already ${request.status}` }, 409);
  }

  const geminiKey = getSecret("GEMINI_API_KEY", "gemini");
  if (!geminiKey) {
    const message = JSON.stringify({
      error: "Gemini secret is not available at runtime",
      GEMINI_API_KEY: Boolean(Deno.env.get("GEMINI_API_KEY")),
      gemini: Boolean(Deno.env.get("gemini")),
    });
    await admin.from("research_requests").update({ status: "failed", error_message: message }).eq("id", requestId);
    return json({ success: false, requestId, error: message }, 500);
  }

  await admin.from("research_requests").update({ status: "running", provider: "gemini", error_message: null }).eq("id", requestId);
  await admin.from("audit_events").insert({
    actor_type: "aria",
    actor_id: userData.user.id,
    action: "research.started",
    entity_type: "research_request",
    entity_id: requestId,
    metadata: { provider: "gemini", model: "gemini-3.6-flash" },
  });

  const industries = Array.isArray(request.industries) ? request.industries : [];
  const geography = request.geography || "Nigeria";
  const prompt = `You are the research engine for ABE TechLab. Research this B2B prospecting request: ${request.query}

Geography: ${geography}
Industries: ${industries.join(", ") || "Any relevant industry"}

Find up to 5 real organisations that may have a credible need for ABE TechLab services such as custom web development, mobile app development, system development, software engineering, automation, artificial intelligence (AI), or digital transformation.

Use public web information and Google Search grounding. Do not invent organisations, websites, facts, people, contact details, or evidence. Prefer recent, concrete signals such as a new digital initiative, expansion, outdated digital workflow, technology hiring, new product launch, operational scaling, or an explicitly stated technology need.

Return JSON only:
{
  "organisations": [
    {
      "name": "Company name",
      "website": "https://example.com",
      "industry": "Industry",
      "geography": "City, Nigeria",
      "likely_need": "Specific plausible technology problem",
      "recommended_service": "ABE TechLab service",
      "score": 0,
      "confidence": 0,
      "reasons": ["specific evidence-based reason"],
      "sources": [
        {"title": "Source title", "url": "https://...", "evidence": "Short evidence statement"}
      ]
    }
  ]
}

Every organisation must have at least one source URL. Keep score and confidence between 0 and 100.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      },
    );

    const raw = await response.text();
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${raw.slice(0, 1200)}`);

    const data = JSON.parse(raw);
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join("\n");
    const parsed = parseJson(text);
    if (!Array.isArray(parsed?.organisations)) throw new Error("Gemini returned an invalid research result shape");

    let createdProspects = 0;
    let createdLeads = 0;

    for (const item of parsed.organisations.slice(0, 5)) {
      if (!item?.name?.trim()) continue;
      const sources = Array.isArray(item.sources)
        ? item.sources.filter((source: any) => source?.url && source?.title).slice(0, 3)
        : [];
      if (!sources.length) continue;

      const name = item.name.trim();
      const score = clamp(item.score);
      const confidence = clamp(item.confidence);

      const { data: existing } = await admin
        .from("organisations")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

      let organisationId = existing?.id;
      if (!organisationId) {
        const { data: organisation, error } = await admin
          .from("organisations")
          .insert({
            name,
            industry: item.industry ?? null,
            geography: item.geography ?? geography,
            website_url: item.website ?? null,
          })
          .select("id")
          .single();
        if (error) throw new Error(`Organisation insert failed: ${error.message}`);
        organisationId = organisation.id;
      }

      const evidence = sources.map((source: any) => ({
        sourceType: "web",
        title: source.title,
        url: source.url,
        evidence: source.evidence ?? null,
      }));

      const { data: prospect, error: prospectError } = await admin
        .from("prospects")
        .insert({
          organisation_id: organisationId,
          status: "new",
          likely_need: item.likely_need ?? null,
          recommended_service: item.recommended_service ?? null,
          score,
          confidence,
          evidence,
        })
        .select("id")
        .single();
      if (prospectError) throw new Error(`Prospect insert failed: ${prospectError.message}`);

      for (const source of sources) {
        const { error } = await admin.from("research_sources").insert({
          research_request_id: requestId,
          prospect_id: prospect.id,
          url: source.url,
          title: source.title,
          snippet: source.evidence ?? null,
          provider: "gemini",
        });
        if (error) throw new Error(`Research source insert failed: ${error.message}`);
      }

      const classification = score >= 85 ? "high" : score >= 70 ? "medium" : "low";
      const { error: qualificationError } = await admin.from("qualifications").insert({
        prospect_id: prospect.id,
        score,
        classification,
        confidence,
        reasons: Array.isArray(item.reasons) ? item.reasons : [],
        recommended_service: item.recommended_service ?? null,
        next_action: score >= 70 ? "human_review" : "research_more",
        source: "gemini_research",
      });
      if (qualificationError) throw new Error(`Qualification insert failed: ${qualificationError.message}`);

      if (score >= 70) {
        const { error: leadError } = await admin.from("leads").insert({
          organisation_id: organisationId,
          prospect_id: prospect.id,
          status: "new",
          service_interest: item.recommended_service ?? null,
          problem_summary: item.likely_need ?? null,
          score,
          source: "aria_research",
        });
        if (leadError) throw new Error(`Lead insert failed: ${leadError.message}`);
        createdLeads++;
      }

      await admin.from("audit_events").insert({
        actor_type: "aria",
        actor_id: userData.user.id,
        action: "research.prospect_created",
        entity_type: "prospect",
        entity_id: prospect.id,
        metadata: { research_request_id: requestId, provider: "gemini", score, confidence, source_count: sources.length },
      });

      createdProspects++;
    }

    if (createdProspects === 0) throw new Error("Research completed but no valid prospects with evidence were returned");

    await admin.from("research_requests").update({
      status: "completed",
      provider: "gemini",
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", requestId);

    await admin.from("audit_events").insert({
      actor_type: "aria",
      actor_id: userData.user.id,
      action: "research.completed",
      entity_type: "research_request",
      entity_id: requestId,
      metadata: { provider: "gemini", model: "gemini-3.6-flash", created_prospects: createdProspects, created_leads: createdLeads },
    });

    return json({ success: true, requestId, provider: "gemini", model: "gemini-3.6-flash", createdProspects, createdLeads });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("research_requests").update({ status: "failed", provider: "gemini", error_message: message }).eq("id", requestId);
    await admin.from("audit_events").insert({
      actor_type: "aria",
      actor_id: userData.user.id,
      action: "research.failed",
      entity_type: "research_request",
      entity_id: requestId,
      metadata: { provider: "gemini", model: "gemini-3.6-flash", error: message },
    });
    return json({ success: false, requestId, provider: "gemini", error: message }, 500);
  }
});
