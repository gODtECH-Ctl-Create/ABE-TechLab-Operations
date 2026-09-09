# ARIA AI Runtime

ARIA is isolated behind the existing provider router. The first runtime slice is read-only and advisory: it can inspect Operations data, produce recommendations, and record execution metadata, but it cannot mutate business records.

## Server environment

```text
ARIA_AI_RUNTIME_MODE=off
CLIENT_ASSISTANT_AI_RUNTIME_MODE=advisory
AI_PROVIDER_TIMEOUT_MS=15000
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
```

Both runtime variables accept `off`, `advisory`, or `action`. ARIA defaults to `off`; the Client Assistant defaults to `advisory` to preserve its existing behavior. The legacy `AI_RUNTIME_MODE` remains a shared fallback during rollout. Keep ARIA off until the NVIDIA credential and AI runtime migration are deployed. The initial ARIA endpoint is designed for `advisory` mode only.

Provider calls time out after 15 seconds by default so failover can continue. `AI_PROVIDER_TIMEOUT_MS` may be set between 1,000 and 60,000 milliseconds.

## NVIDIA provider

NVIDIA is the first provider in the pool. The adapter uses NVIDIA's OpenAI-compatible chat completions endpoint. Existing providers remain available as fallbacks.

Provider keys are server-side only and must never be exposed to browser code.

## First runtime surface

`POST /api/ai/aria/brief` requires an authenticated Operations user with an administrator, operator, or reviewer role. It reads leads, opportunities, invoices, recent audit activity, and pending approvals, then asks ARIA for a decision-ready briefing. No business write is performed by this endpoint.

Invoice totals are calculated from stored line items, tax/other charges, and amount paid before the data is supplied to ARIA.
