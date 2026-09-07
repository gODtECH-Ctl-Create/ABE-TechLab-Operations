# AI Architecture

The Operations AI stack is split into three layers:

```text
ARIA / Client Assistant
        |
        v
   AI Gateway
        |
        v
 Provider Router
        |
        +-- NVIDIA NIM
        +-- Gemini
        +-- Grok
        +-- OpenRouter
        +-- Cerebras
        +-- AgentRouter
        +-- OpenAI fallback
```

## Responsibilities

`lib/ai/gateway.ts` is the boundary between agent behavior and model transport. It identifies the calling surface and applies the shared runtime policy before provider execution.

`lib/ai/provider-router.ts` owns provider configuration, failover, model selection, usage recording, and provider health. Providers remain replaceable.

`lib/ai/aria.ts` owns internal Operations intelligence. It can inspect governed Operations data and produce recommendations without directly mutating business records.

`lib/assistant/runtime.ts` owns the customer-facing Client Assistant. It keeps its own conversation and workflow semantics while using the same gateway for model access.

## Safety boundary

`AI_RUNTIME_MODE=off` disables all model execution.

`AI_RUNTIME_MODE=advisory` allows read-only intelligence and recommendations.

`AI_RUNTIME_MODE=action` is reserved for a later phase where every write-capable tool is individually governed and can route through the existing human approval queue.

## Research boundary

Web research is treated as a specialized capability rather than as a generic model call. The current research worker keeps its search-grounding implementation while the shared model/provider layer is used for general Operations intelligence. This prevents web-search requirements from leaking into the general AI gateway.
