import {
  generateWithFailover,
  getAiRuntimeMode,
  type AiRouterResult,
} from "@/lib/ai/provider-router";

export type AiSurface = "aria_internal" | "client_assistant";

export type AiGatewayRequest = {
  surface: AiSurface;
  prompt: string;
  task: string;
  requestId?: string;
};

const surfaceLabel: Record<AiSurface, string> = {
  aria_internal: "ARIA internal operations",
  client_assistant: "client-facing assistant",
};

export function assertAiSurfaceEnabled(surface: AiSurface) {
  const mode = getAiRuntimeMode(surface);
  if (mode === "off") {
    const variable = surface === "aria_internal" ? "ARIA_AI_RUNTIME_MODE" : "CLIENT_ASSISTANT_AI_RUNTIME_MODE";
    throw new Error(`AI execution is disabled for ${surfaceLabel[surface]}. Set ${variable}=advisory or action.`);
  }

  if (surface === "aria_internal" && mode === "action") {
    throw new Error("ARIA action mode is reserved for the controlled tool-execution phase.");
  }
}

export async function generateAi(request: AiGatewayRequest): Promise<AiRouterResult & { surface: AiSurface }> {
  assertAiSurfaceEnabled(request.surface);

  const result = await generateWithFailover(request.prompt, request.task, request.requestId);
  return { ...result, surface: request.surface };
}
