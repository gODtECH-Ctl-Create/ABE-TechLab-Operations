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
});
