import { createSupabaseServerClient } from "../supabase/server";

type ProviderName = "gemini" | "grok" | "openrouter" | "cerebras" | "agentrouter" | "openai";
type ProviderConfig = { name: ProviderName; label: string; keyEnv: string; modelEnv: string; defaultModel: string; baseUrl?: string };
export type AiRouterResult = { text: string; provider: ProviderName; model: string; fallbackUsed: boolean; attempted: ProviderName[]; usage?: { inputTokens?: number; outputTokens?: number } };

export const PROVIDERS: ProviderConfig[] = [
  { name: "gemini", label: "Gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-2.5-flash" },
  { name: "grok", label: "Grok", keyEnv: "GROK_API_KEY", modelEnv: "GROK_MODEL", defaultModel: "grok-4-fast-non-reasoning", baseUrl: "https://api.x.ai/v1" },
  { name: "openrouter", label: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "meta-llama/llama-3.3-8b-instruct:free", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "cerebras", label: "Cerebras", keyEnv: "CEREBRAS_API_KEY", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", baseUrl: "https://api.cerebras.ai/v1" },
  { name: "agentrouter", label: "AgentRouter", keyEnv: "AGENTIC_API_KEY", modelEnv: "AGENTROUTER_MODEL", defaultModel: "deepseek-v4-flash", baseUrl: "https://api.agentrouter.to/api/agentic-api" },
  { name: "openai", label: "OpenAI", keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-5.4-mini", baseUrl: "https://api.openai.com/v1" },
];
const configured = (c: ProviderConfig) => Boolean(process.env[c.keyEnv]);
const modelFor = (c: ProviderConfig) => process.env[c.modelEnv] || c.defaultModel;
const usageTable = (client: any) => client.from("ai_provider_usage");

async function callOpenAiCompatible(config: ProviderConfig, prompt: string) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${process.env[config.keyEnv]}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: modelFor(config), messages: [{ role: "user", content: prompt }], temperature: 0.2 }) });
  const raw = await response.text(); if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`); const data = JSON.parse(raw);
  return { text: data?.choices?.[0]?.message?.content ?? "", usage: { inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens } };
}
async function callGemini(config: ProviderConfig, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelFor(config)}:generateContent?key=${process.env[config.keyEnv]}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }) });
  const raw = await response.text(); if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`); const data = JSON.parse(raw);
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text).filter(Boolean).join("\n");
  return { text, usage: { inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount } };
}
async function callAgentRouter(config: ProviderConfig, prompt: string) {
  const response = await fetch(`${config.baseUrl}/domains/models/capabilities/chat-complete/execute`, { method: "POST", headers: { Authorization: `Bearer ${process.env[config.keyEnv]}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: modelFor(config), messages: [{ role: "user", content: prompt }], allowFallback: true }) });
  const raw = await response.text(); if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`); const data = JSON.parse(raw);
  return { text: data?.completionText ?? data?.text ?? data?.choices?.[0]?.message?.content ?? "", usage: { inputTokens: data?.usage?.inputTokens, outputTokens: data?.usage?.outputTokens } };
}
async function callProvider(config: ProviderConfig, prompt: string) { if (config.name === "gemini") return callGemini(config, prompt); if (config.name === "agentrouter") return callAgentRouter(config, prompt); return callOpenAiCompatible(config, prompt); }

export async function generateWithFailover(prompt: string, task = "general", requestId?: string): Promise<AiRouterResult> {
  const attempted: ProviderName[] = []; let lastError: Error | undefined; const supabase = await createSupabaseServerClient().catch(() => null);
  for (const config of PROVIDERS) {
    if (!configured(config)) continue; attempted.push(config.name); const started = Date.now();
    try { const result = await callProvider(config, prompt); if (supabase) await usageTable(supabase).insert({ provider: config.name, task, status: "success", duration_ms: Date.now() - started, input_tokens: result.usage?.inputTokens ?? null, output_tokens: result.usage?.outputTokens ?? null, request_id: requestId ?? null }); return { text: result.text, provider: config.name, model: modelFor(config), fallbackUsed: attempted.length > 1, attempted, usage: result.usage }; }
    catch (error) { lastError = error instanceof Error ? error : new Error(String(error)); if (supabase) await usageTable(supabase).insert({ provider: config.name, task, status: "failed", duration_ms: Date.now() - started, error_message: lastError.message.slice(0, 1000), request_id: requestId ?? null }); }
  }
  throw new Error(`No configured AI provider succeeded. Attempted: ${attempted.join(", ") || "none"}. Last error: ${lastError?.message ?? "no providers configured"}`);
}

export function getProviderHealth() { return PROVIDERS.map((config, index) => ({ name: config.name, label: config.label, priority: index + 1, configured: configured(config), model: modelFor(config), keyEnv: config.keyEnv })); }

export async function getAgentRouterWallet() {
  const key = process.env.AGENTIC_API_KEY; if (!key) return { configured: false, balanceCredits: null, balanceUsd: null, usage: [] as unknown[] };
  const base = process.env.AGENTIC_API_BASE_URL || "https://api.agentrouter.to/api/agentic-api"; const headers = { Authorization: `Bearer ${key}` };
  const [walletResponse, usageResponse] = await Promise.all([fetch(`${base}/wallet`, { headers }), fetch(`${base}/usage?limit=20`, { headers })]);
  const wallet = walletResponse.ok ? await walletResponse.json() : null; const usage = usageResponse.ok ? await usageResponse.json() : [];
  const credits = typeof wallet?.balanceCredits === "number" ? wallet.balanceCredits : typeof wallet?.balance === "number" ? wallet.balance : null;
  return { configured: true, balanceCredits: credits, balanceUsd: credits == null ? null : credits / 1000, usage: Array.isArray(usage) ? usage : usage?.items ?? [], error: !walletResponse.ok ? `Wallet request returned ${walletResponse.status}` : null };
}

export async function getAiProviderDashboard() {
  const health = getProviderHealth(); const supabase = await createSupabaseServerClient();
  const { data: usage } = await usageTable(supabase).select("provider,status,input_tokens,output_tokens,duration_ms,error_message,created_at").order("created_at", { ascending: false }).limit(200);
  const since = Date.now() - 24 * 60 * 60 * 1000; const recent = ((usage ?? []) as Array<any>).filter((item) => new Date(item.created_at).getTime() >= since);
  const providerStats = health.map((provider) => { const rows = recent.filter((item) => item.provider === provider.name); const failures = rows.filter((item) => item.status === "failed").length; return { ...provider, requests24h: rows.length, successes24h: rows.filter((item) => item.status === "success").length, failures24h: failures, failureRate24h: rows.length ? Math.round((failures / rows.length) * 100) : 0, inputTokens24h: rows.reduce((sum, row) => sum + (row.input_tokens ?? 0), 0), outputTokens24h: rows.reduce((sum, row) => sum + (row.output_tokens ?? 0), 0), lastRequestAt: rows[0]?.created_at ?? null }; });
  return { providers: providerStats, agentRouter: await getAgentRouterWallet() };
}
