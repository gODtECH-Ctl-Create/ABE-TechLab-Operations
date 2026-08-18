import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const geminiKey = getSecret("GEMINI_API_KEY", "gemini");
  const grokKey = getSecret("GROK_API_KEY", "groq");
  const openRouterKey = getSecret("OPENROUTER_API_KEY", "open router");
  const cerebrasKey = getSecret("CEREBRAS_API_KEY", "Cerebras");
  const agentRouterKey = getSecret("AGENT_ROUTER_API_KEY", "AGENTIC_API_KEY", "Agent Router");

  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) return json({ error: "query is required" }, 400);

  const prompt = `Research the following B2B prospecting request for ABE TechLab: ${query}

Find up to 5 real organisations in Nigeria that may have a credible need for custom web development, software systems, automation, artificial intelligence (AI), or digital transformation services.

Use public web information. Do not invent companies, facts, websites, people, or evidence.

Return JSON only in this shape:
{
  "organisations": [
    {
      "name": "Company name",
      "website": "https://...",
      "industry": "...",
      "likely_need": "...",
      "recommended_service": "...",
      "score": 0,
      "confidence": 0,
      "reasons": ["..."],
      "sources": [{"title":"...","url":"...","evidence":"..."}]
    }
  ]
}`;

  const errors: Record<string, string> = {};

  // Gemini is intentionally first. The API key already exists in Supabase.
  // The previous gemini-2.5-flash model caused the 404. Use the current model here.
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
          }),
        },
      );

      const raw = await response.text();
      if (!response.ok) throw new Error(`Gemini ${response.status}: ${raw.slice(0, 800)}`);

      const data = JSON.parse(raw);
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text)
        .filter(Boolean)
        .join("\n");

      return json({
        success: true,
        provider: "gemini",
        model: "gemini-3.6-flash",
        result: text,
      });
    } catch (error) {
      errors.gemini = error instanceof Error ? error.message : String(error);
    }
  } else {
    errors.gemini = "Gemini secret is not available at runtime";
  }

  // Keep the remaining configured providers as fallback diagnostics for now.
  // They are deliberately not called with guessed models until their provider
  // configurations are verified, preventing another cascade of stale-model errors.
  const configuredFallbacks = {
    grok: Boolean(grokKey),
    openrouter: Boolean(openRouterKey),
    cerebras: Boolean(cerebrasKey),
    agentrouter: Boolean(agentRouterKey),
  };

  return json({
    success: false,
    error: "Gemini research provider failed",
    errors,
    configuredFallbacks,
  }, 502);
});
