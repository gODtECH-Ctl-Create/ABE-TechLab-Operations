import { createSupabaseServerClient } from "../supabase/server";
import { createSupabaseServiceClient } from "../supabase/service";

type ProviderName = "nvidia" | "gemini" | "grok" | "openrouter" | "cerebras" | "agentrouter" | "openai";
type ProviderConfig = { name: ProviderName; label: string; keyEnv: string; modelEnv: string; defaultModel: string; baseUrl?: string };
export type AiRouterResult = { text: string; provider: ProviderName; model: string; fallbackUsed: boolean; attempted: ProviderName[]; usage?: { inputTokens?: number; outputTokens?: number } };
export type AiRuntimeMode = "off" | "advisory" | "action";
export type AiRuntimeSurface = "aria_internal" | "client_assistant";

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
  ? (process.env.AGENT_ROUTER_API_KEY || process.env.AGENTIC_API_KEY)
  : process.env[config.keyEnv];
const configured = (config: ProviderConfig) => Boolean(envKeyFor(config));
const modelFor = (config: ProviderConfig) => process.env[config.modelEnv] || config.defaultModel;

function normalizeRuntimeMode(value: string | undefined, fallback: AiRuntimeMode): AiRuntimeMode {
  const normalized = String(value || fallback).toLowerCase();
  return normalized === "advisory" || normalized === "action" ? normalized : "off";
}

export function getAiRuntimeMode(surface: AiRuntimeSurface = "aria_internal"): AiRuntimeMode {
  if (surface === "client_assistant") {
    return normalizeRuntimeMode(
      process.env.CLIENT_ASSISTANT_AI_RUNTIME_MODE || process.env.AI_RUNTIME_MODE,
      "advisory",
    );
  }

  const value = process.env.ARIA_AI_RUNTIME_MODE || process.env.AI_RUNTIME_MODE;
  return normalizeRuntimeMode(value, "off");
}

export function getProviderTimeoutMs(task = "general") {
  if (task === "aria_operations_brief") {
    const value = Number(process.env.ARIA_PROVIDER_TIMEOUT_MS || 90000);
    return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 1000), 120000) : 90000;
  }
  const value = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 15000);
  if (!Number.isFinite(value)) return 15000;
  return Math.min(Math.max(Math.round(value), 1000), 60000);
}

function assertProviderText(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} returned an empty response`);
  return text;
}

function parseProviderJson(raw: string, label: string) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function providerFetch(url: string, init: RequestInit, timeoutMs: number) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export function isAiRuntimeEnabled(surface: AiRuntimeSurface) {
  return getAiRuntimeMode(surface) !== "off";
}

async function callOpenAiCompatible(config: ProviderConfig, prompt: string, timeoutMs: number, task: string) {
  const response = await providerFetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${envKeyFor(config)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelFor(config), messages: [{ role: "user", content: prompt }], temperature: 0.2,
      ...(config.name === "nvidia" && task === "aria_operations_brief" ? { max_tokens: 4096 } : {}),
    }),
  }, timeoutMs);
  const raw = await response.text();
  if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`);
  const data = parseProviderJson(raw, config.label);
  return { text: assertProviderText(data?.choices?.[0]?.message?.content, config.label), usage: { inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens } };
}

async function callGemini(config: ProviderConfig, prompt: string, timeoutMs: number) {
  const response = await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelFor(config)}:generateContent?key=${envKeyFor(config)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
  }, timeoutMs);
  const raw = await response.text();
  if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`);
  const data = parseProviderJson(raw, config.label);
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text).filter(Boolean).join("\n");
  return { text: assertProviderText(text, config.label), usage: { inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount } };
}

async function callAgentRouter(config: ProviderConfig, prompt: string, timeoutMs: number) {
  const response = await providerFetch(`${config.baseUrl}/domains/models/capabilities/chat-complete/execute`, {
    method: "POST",
    headers: { Authorization: `Bearer ${envKeyFor(config)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelFor(config), messages: [{ role: "user", content: prompt }], allowFallback: true }),
  }, timeoutMs);
  const raw = await response.text();
  if (!response.ok) throw new Error(`${config.label} returned ${response.status}: ${raw.slice(0, 500)}`);
  const data = parseProviderJson(raw, config.label);
  return { text: assertProviderText(data?.completionText ?? data?.text ?? data?.choices?.[0]?.message?.content, config.label), usage: { inputTokens: data?.usage?.inputTokens, outputTokens: data?.usage?.outputTokens } };
}

async function callProvider(config: ProviderConfig, prompt: string, timeoutMs: number, task: string) {
  if (config.name === "gemini") return callGemini(config, prompt, timeoutMs);
  if (config.name === "agentrouter") return callAgentRouter(config, prompt, timeoutMs);
  return callOpenAiCompatible(config, prompt, timeoutMs, task);
}

export async function generateWithFailover(prompt: string, task = "general", requestId?: string): Promise<AiRouterResult> {
  const attempted: ProviderName[] = [];
  let lastError: Error | undefined;
  // Bound the whole ARIA provider chain, leaving time for auth, data and audit writes.
  const deadline = task === "aria_operations_brief" ? Date.now() + 240000 : Infinity;
  const supabase = (() => {
    try { return createSupabaseServiceClient(); }
    catch { return null; }
  })();

  for (const config of PROVIDERS) {
    if (!configured(config)) continue;
    const timeoutMs = Math.min(getProviderTimeoutMs(task), deadline - Date.now());
    if (timeoutMs < 1000) break;
    attempted.push(config.name);
    const started = Date.now();
    try {
      const result = await callProvider(config, prompt, timeoutMs, task);
      if (supabase) await (supabase as any).from("ai_provider_usage").insert({ provider: config.name, task, status: "success", duration_ms: Date.now() - started, input_tokens: result.usage?.inputTokens ?? null, output_tokens: result.usage?.outputTokens ?? null, request_id: requestId ?? null });
      return { text: result.text, provider: config.name, model: modelFor(config), fallbackUsed: attempted.length > 1, attempted, usage: result.usage };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === "TimeoutError" || lastError.name === "AbortError") {
        lastError = new Error(`${config.label} did not finish within ${Math.round(timeoutMs / 1000)} seconds. Please retry shortly; if this persists, check provider latency or configure a fallback provider.`);
      }
      if (supabase) await (supabase as any).from("ai_provider_usage").insert({ provider: config.name, task, status: "failed", duration_ms: Date.now() - started, error_message: lastError.message.slice(0, 1000), request_id: requestId ?? null });
    }
  }

  throw new Error(`No configured AI provider succeeded. Attempted: ${attempted.join(", ") || "none"}. Last error: ${lastError?.message ?? "no providers configured"}`);
}

export function getProviderHealth() {
  return PROVIDERS.map((config, index) => ({ name: config.name, label: config.label, priority: index + 1, configured: configured(config), model: modelFor(config), keyEnv: config.keyEnv }));
}

export async function getAgentRouterWallet() {
  const key = process.env.AGENT_ROUTER_API_KEY || process.env.AGENTIC_API_KEY;
  if (!key) return { configured: false, balanceCredits: null, balanceUsd: null, usage: [] as unknown[] };
  const base = process.env.AGENT_ROUTER_API_BASE_URL || process.env.AGENTIC_API_BASE_URL || "https://api.agentrouter.to/api/agentic-api";
  const headers = { Authorization: `Bearer ${key}` };
  const [walletResponse, usageResponse] = await Promise.all([fetch(`${base}/wallet`, { headers }), fetch(`${base}/usage?limit=20`, { headers })]);
  const wallet = walletResponse.ok ? await walletResponse.json() : null;
  const usage = usageResponse.ok ? await usageResponse.json() : [];
  const credits = typeof wallet?.balanceCredits === "number" ? wallet.balanceCredits : typeof wallet?.balance === "number" ? wallet.balance : null;
  return { configured: true, balanceCredits: credits, balanceUsd: credits == null ? null : credits / 1000, usage: Array.isArray(usage) ? usage : usage?.items ?? [], error: !walletResponse.ok ? `Wallet request returned ${walletResponse.status}` : null };
}

export async function getAiProviderDashboard() {
  const health = getProviderHealth();
  const supabase = await createSupabaseServerClient();
  const { data: usage } = await (supabase as any).from("ai_provider_usage").select("provider,status,input_tokens,output_tokens,duration_ms,error_message,created_at").order("created_at", { ascending: false }).limit(200);
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = ((usage ?? []) as Array<any>).filter((item) => new Date(item.created_at).getTime() >= since);
  const providers = health.map((provider) => {
    const rows = recent.filter((item) => item.provider === provider.name);
    const failures = rows.filter((item) => item.status === "failed").length;
    return { ...provider, requests24h: rows.length, successes24h: rows.filter((item) => item.status === "success").length, failures24h: failures, failureRate24h: rows.length ? Math.round((failures / rows.length) * 100) : 0, inputTokens24h: rows.reduce((sum, row) => sum + (row.input_tokens ?? 0), 0), outputTokens24h: rows.reduce((sum, row) => sum + (row.output_tokens ?? 0), 0), lastRequestAt: rows[0]?.created_at ?? null };
  });
  return {
    providers,
    agentRouter: await getAgentRouterWallet(),
    mode: getAiRuntimeMode("aria_internal"),
    assistantMode: getAiRuntimeMode("client_assistant"),
  };
}
