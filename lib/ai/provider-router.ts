import { env } from "process";

type ProviderName = "nvidia" | "gemini" | "grok" | "openrouter" | "cerebras" | "agentrouter" | "openai";

type ProviderConfig = {
  name: ProviderName;
  label: string;
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
  baseUrl?: string;
};

export type AiRouterResult = {
  text: string;
  provider: ProviderName;
  model: string;
  fallbackUsed: boolean;
  attempted: ProviderName[];
  usage?: { inputTokens?: number; outputTokens?: number };
};

export type AiRuntimeMode = "off" | "advisory" | "action";

export const PROVIDERS: ProviderConfig[] = [
  { name: "nvidia", label: "NVIDIA NIM", keyEnv: "NVIDIA_API_KEY", modelEnv: "NVIDIA_MODEL", defaultModel: "nvidia/nemotron-3.5-lightning-30b-a3b", baseUrl: "https://integrate.api.nvidia.com/v1" },
  { name: "gemini", label: "Gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-2.5-flash" },
  { name: "grok", label: "Grok", keyEnv: "GROK_API_KEY", modelEnv: "GROK_MODEL", defaultModel: "grok-4-fast-non-reasoning", baseUrl: "https://api.x.ai/v1" },
  { name: "openrouter", label: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "meta-llama/llama-3.3-8b-instruct:free", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "cerebras", label: "Cerebras", keyEnv: "CEREBRAS_API_KEY", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", baseUrl: "https://api.cerebras.ai/v1" },
  { name: "agentrouter", label: "AgentRouter", keyEnv: "AGENT_ROUTER_API_KEY", modelEnv: "AGENTROUTER_MODEL", defaultModel: "deepseek-v4-flash", baseUrl: "https://api.agentrouter.to/api/agentic-api" },
  { name: "openai", label: "OpenAI", keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-5.4-mini", baseUrl: "https://api.openai.com/v1" },
];

const envKeyFor = (config: ProviderConfig) => config.name === "agentrouter"
  ? (env.AGENT_ROUTER_API_KEY || env.AGENTIC_API_KEY)
  : env[config.keyEnv];

const configured = (config: ProviderConfig) => Boolean(envKeyFor(config));
const modelFor = (config: ProviderConfig) => env[config.modelEnv] || config.defaultModel;

export function getAiRuntimeMode(): AiRuntimeMode {
  const value = String(env.AI_RUNTIME_MODE || "off").toLowerCase();
  return value === "advisory" || value === "action" ? value : "off";
}

async function callOpenAiCompatible(config: ProviderConfig, prompt: string) {
  if (!config.baseUrl) throw new Error(`${config.label} base URL is not configured`);
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${envKeyFor(config)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelFor(config), messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`);
  const data = JSON.parse(raw);
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: { inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens } };
}

async function callGemini(config: ProviderConfig, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelFor(config)}:generateContent?key=${envKeyFor(config)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`);
  const data = JSON.parse(raw);
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text).filter(Boolean).join("\n");
  return { text, usage: { inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount } };
}

async function callProvider(config: ProviderConfig, prompt: string) {
  if (config.name === "gemini") return callGemini(config, prompt);
  return callOpenAiCompatible(config, prompt);
}

export async function generateWithFailover(prompt: string, task = "general", requestId?: string): Promise<AiRouterResult> {
  const mode = getAiRuntimeMode();
  if (mode === "off") throw new Error("AI runtime is disabled. Set AI_RUNTIME_MODE=advisory or action to enable execution.");

  const attempted: ProviderName[] = [];
  let lastError: Error | undefined;
  const supabase = await import("../supabase/server").then(({ createSupabaseServerClient }) => createSupabaseServerClient().catch(() => null));

  for (const config of PROVIDERS) {
    if (!configured(config)) continue;
    attempted.push(config.name);
    const started = Date.now();
    try {
      const result = await callProvider(config, prompt);
      if (supabase) await (supabase as any).from("ai_provider_usage").insert({ provider: config.name, task, status: "success", duration_ms: Date.now() - started, input_tokens: result.usage?.inputTokens ?? null, output_tokens: result.usage?.outputTokens ?? null, request_id: requestId ?? null });
      return { text: result.text, provider: config.name, model: modelFor(config), fallbackUsed: attempted.length > 1, attempted, usage: result.usage };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (supabase) await (supabase as any).from("ai_provider_usage").insert({ provider: config.name, task, status: "failed", duration_ms: Date.now() - started, error_message: lastError.message.slice(0, 1000), request_id: requestId ?? null });
    }
  }
  throw new Error(`No configured AI provider succeeded. Attempted: ${attempted.join(", ") || "none"}. Last error: ${lastError?.message ?? "no providers configured"}`);
}

export function getProviderHealth() {
  return PROVIDERS.map((config, index) => ({ name: config.name, label: config.label, priority: index + 1, configured: configured(config), model: modelFor(config), keyEnv: config.keyEnv }));
}

export async function getAiProviderDashboard() {
  const health = getProviderHealth();
  const supabase = await import("../supabase/server").then(({ createSupabaseServerClient }) => createSupabaseServerClient());
  const { data: usage } = await (supabase as any).from("ai_provider_usage").select("provider,status,input_tokens,output_tokens,duration_ms,error_message,created_at").order("created_at", { ascending: false }).limit(200);
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = ((usage ?? []) as Array<any>).filter((item) => new Date(item.created_at).getTime() >= since);
  return health.map((provider) => {
    const rows = recent.filter((item) => item.provider === provider.name);
    const failures = rows.filter((item) => item.status === "failed").length;
    return { ...provider, requests24h: rows.length, successes24h: rows.filter((item) => item.status === "success").length, failures24h: failures, failureRate24h: rows.length ? Math.round((failures / rows.length) * 100) : 0, inputTokens24h: rows.reduce((sum, row) => sum + (row.input_tokens ?? 0), 0), outputTokens24h: rows.reduce((sum, row) => sum + (row.output_tokens ?? 0), 0), lastRequestAt: rows[0]?.created_at ?? null };
  });
}
