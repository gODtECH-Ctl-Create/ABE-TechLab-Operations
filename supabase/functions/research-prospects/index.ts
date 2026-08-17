import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Source = { url: string; title: string; snippet: string | null };
type Item = {
  name: string;
  website_url: string | null;
  industry: string | null;
  geography: string | null;
  likely_need: string;
  recommended_service: string;
  score: number;
  confidence: number;
  reasons: string[];
  sources: Source[];
};

function out(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(r: any) {
  if (typeof r?.output_text === "string") return r.output_text;
  return (r?.output ?? [])
    .flatMap((i: any) => i?.content ?? [])
    .map((c: any) => c?.text)
    .filter((x: any) => typeof x === "string")
    .join("\n");
}

function clamp(v: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openai = Deno.env.get("OPENAI_API_KEY");

  if (!url || !service) return out({ error: "Supabase function configuration is incomplete" }, 500);
  if (!openai) return out({ error: "OPENAI_API_KEY is not configured for the research worker" }, 500);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return out({ error: "Missing authorization" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(auth.slice(7));
  if (ue || !u.user) return out({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const requestId = body?.requestId;
  if (typeof requestId !== "string" || !requestId) return out({ error: "requestId is required" }, 400);

  const { data: request, error: re } = await admin
    .from("research_requests")
    .select("id,query,geography,industries,status")
    .eq("id", requestId)
    .single();
  if (re || !request) return out({ error: "Research request not found" }, 404);
  if (!["queued", "failed"].includes(request.status)) {
    return out({ error: `Research request is already ${request.status}` }, 409);
  }

  await admin.from("research_requests")
    .update({ status: "running", provider: "openai_web_search", error_message: null })
    .eq("id", requestId);

  await admin.from("audit_events").insert({
    actor_type: "aria",
    actor_id: u.user.id,
    action: "research.started",
    entity_type: "research_request",
    entity_id: requestId,
    metadata: { provider: "openai_web_search" },
  });

  const industries = Array.isArray(request.industries) ? request.industries : [];
  const prompt = `Research potential B2B customers for ABE TechLab. Request: ${request.query}. Geography: ${request.geography ?? "Nigeria"}. Industries: ${industries.join(", ") || "Any relevant industry"}. Find up to 10 real organisations with public evidence of a relevant software, AI, automation, digital transformation, product-development, marketing, or operations need. Use public web sources only. Never invent organisations, websites, facts, people, emails, phone numbers, or evidence. For each return name, official website if found, industry, geography, likely_need, recommended_service, score 0-100, confidence 0-100, 2-4 reasons, and 1-3 sources with url, title and short evidence snippet. Return JSON only: {"organisations":[...]}. Do not recommend outreach or create a lead unless evidence supports a plausible business need.`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openai}` },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });

    const raw = await r.text();
    if (!r.ok) throw new Error(`Research provider failed (${r.status}): ${raw.slice(0, 1000)}`);

    const parsed = JSON.parse(
      text(JSON.parse(raw)).replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim(),
    );
    if (!Array.isArray(parsed?.organisations)) throw new Error("Research provider returned an invalid result shape");

    let created = 0;

    for (const item of (parsed.organisations as Item[]).slice(0, 10)) {
      if (!item?.name?.trim()) continue;

      const score = clamp(item.score);
      const confidence = clamp(item.confidence);
      const sources = (item.sources ?? []).filter((s) => s?.url && s?.title).slice(0, 3);
      if (!sources.length) continue;

      const { data: existing } = await admin
        .from("organisations")
        .select("id")
        .ilike("name", item.name.trim())
        .limit(1)
        .maybeSingle();

      let organisationId = existing?.id;
      if (!organisationId) {
        const { data: o, error } = await admin
          .from("organisations")
          .insert({
            name: item.name.trim(),
            website_url: item.website_url,
            industry: item.industry,
            geography: item.geography,
          })
          .select("id")
          .single();
        if (error) throw error;
        organisationId = o.id;
      } else {
        await admin.from("organisations").update({
          website_url: item.website_url,
          industry: item.industry,
          geography: item.geography,
        }).eq("id", organisationId);
      }

      const evidence = sources.map((s) => ({
        sourceType: "web",
        claim: s.snippet ?? s.title,
        source: s.url,
        title: s.title,
      }));

      const { data: p, error: pe } = await admin
        .from("prospects")
        .insert({
          organisation_id: organisationId,
          status: "new",
          likely_need: item.likely_need,
          recommended_service: item.recommended_service,
          score,
          confidence,
          evidence,
        })
        .select("id")
        .single();
      if (pe) throw pe;

      for (const s of sources) {
        await admin.from("research_sources").insert({
          research_request_id: requestId,
          prospect_id: p.id,
          url: s.url,
          title: s.title,
          snippet: s.snippet,
          provider: "openai_web_search",
        });
      }

      const classification = score >= 85 ? "high" : score >= 70 ? "medium" : "low";
      await admin.from("qualifications").insert({
        prospect_id: p.id,
        score,
        classification,
        confidence,
        reasons: item.reasons ?? [],
        recommended_service: item.recommended_service,
        next_action: score >= 70 ? "human_review" : "research_more",
        source: "aria_web_research",
      });

      if (score >= 70) {
        const { error: le } = await admin.from("leads").insert({
          organisation_id: organisationId,
          prospect_id: p.id,
          status: "new",
          service_interest: item.recommended_service,
          problem_summary: item.likely_need,
          score,
          source: "aria_research",
        });
        if (le) throw le;
      }

      await admin.from("audit_events").insert({
        actor_type: "aria",
        actor_id: u.user.id,
        action: "research.prospect_created",
        entity_type: "prospect",
        entity_id: p.id,
        metadata: {
          research_request_id: requestId,
          score,
          confidence,
          source_count: sources.length,
          provider: "openai_web_search",
        },
      });
      created++;
    }

    await admin.from("research_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", requestId);

    await admin.from("audit_events").insert({
      actor_type: "aria",
      actor_id: u.user.id,
      action: "research.completed",
      entity_type: "research_request",
      entity_id: requestId,
      metadata: { created_prospects: created, provider: "openai_web_search" },
    });

    return out({ success: true, requestId, createdProspects: created, provider: "openai_web_search" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Research worker failed";
    await admin.from("research_requests").update({ status: "failed", error_message: message }).eq("id", requestId);
    await admin.from("audit_events").insert({
      actor_type: "aria",
      actor_id: u.user.id,
      action: "research.failed",
      entity_type: "research_request",
      entity_id: requestId,
      metadata: { error: message },
    });
    return out({ success: false, requestId, error: message }, 500);
  }
});
