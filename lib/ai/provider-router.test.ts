import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateWithFailover,
  getAiRuntimeMode,
  getProviderTimeoutMs,
} from "./provider-router";

const ENV_KEYS = [
  "AI_RUNTIME_MODE",
  "ARIA_AI_RUNTIME_MODE",
  "CLIENT_ASSISTANT_AI_RUNTIME_MODE",
  "AI_PROVIDER_TIMEOUT_MS",
  "ARIA_PROVIDER_TIMEOUT_MS",
  "NVIDIA_API_KEY",
  "GEMINI_API_KEY",
  "GROK_API_KEY",
  "OPENROUTER_API_KEY",
  "CEREBRAS_API_KEY",
  "AGENT_ROUTER_API_KEY",
  "AGENTIC_API_KEY",
  "OPENAI_API_KEY",
] as const;

describe("AI runtime controls", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps ARIA off while preserving the existing Client Assistant default", () => {
    expect(getAiRuntimeMode("aria_internal")).toBe("off");
    expect(getAiRuntimeMode("client_assistant")).toBe("advisory");
  });

  it("supports independent surface overrides", () => {
    process.env.ARIA_AI_RUNTIME_MODE = "advisory";
    process.env.CLIENT_ASSISTANT_AI_RUNTIME_MODE = "off";
    expect(getAiRuntimeMode("aria_internal")).toBe("advisory");
    expect(getAiRuntimeMode("client_assistant")).toBe("off");
  });

  it("bounds provider timeouts", () => {
    process.env.AI_PROVIDER_TIMEOUT_MS = "100";
    expect(getProviderTimeoutMs()).toBe(1000);
    process.env.AI_PROVIDER_TIMEOUT_MS = "90000";
    expect(getProviderTimeoutMs()).toBe(60000);
    process.env.AI_PROVIDER_TIMEOUT_MS = "invalid";
    expect(getProviderTimeoutMs()).toBe(15000);
  });

  it("rejects an empty provider response so failover can continue", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "" } }],
    }), { status: 200 })));

    await expect(generateWithFailover("test prompt")).rejects.toThrow("returned an empty response");
  });

  it("gives ARIA an isolated, bounded timeout", () => {
    process.env.AI_PROVIDER_TIMEOUT_MS = "15000";
    expect(getProviderTimeoutMs("aria_operations_brief")).toBe(90000);
    expect(getProviderTimeoutMs("aria_follow_up")).toBe(90000);
    expect(getProviderTimeoutMs()).toBe(15000);
    process.env.ARIA_PROVIDER_TIMEOUT_MS = "999999";
    expect(getProviderTimeoutMs("aria_operations_brief")).toBe(120000);
    process.env.ARIA_PROVIDER_TIMEOUT_MS = "invalid";
    expect(getProviderTimeoutMs("aria_operations_brief")).toBe(90000);
  });

  it("bounds NVIDIA briefing output and passes the ARIA timeout to fetch", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Brief" } }] }))));
    vi.stubGlobal("fetch", fetchMock);
    await generateWithFailover("brief", "aria_operations_brief");
    expect(timeout).toHaveBeenCalledWith(90000);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(2048);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).chat_template_kwargs).toEqual({ enable_thinking: false });
    await generateWithFailover("client message");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).max_tokens).toBeUndefined();
    timeout.mockRestore();
  });

  it("reports timeout duration and continues to the next configured provider", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateWithFailover("brief", "aria_operations_brief")).rejects.toThrow("NVIDIA NIM did not finish within 90 seconds");
    process.env.OPENAI_API_KEY = "test-fallback";
    fetchMock.mockReset().mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Fallback brief" } }] })));
    const result = await generateWithFailover("brief", "aria_operations_brief");
    expect(result.fallbackUsed).toBe(true);
    expect(result.attempted).toEqual(["nvidia", "openai"]);
  });
});
