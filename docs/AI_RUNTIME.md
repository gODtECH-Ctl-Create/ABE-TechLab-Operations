# ARIA AI Runtime

ARIA is isolated behind the existing provider router. The first runtime slice is read-only and advisory: it can inspect Operations data, produce recommendations, and record execution metadata, but it cannot mutate business records.

## Server environment

```text
AI_RUNTIME_MODE=off
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
```

`AI_RUNTIME_MODE` accepts `off`, `advisory`, or `action`. Keep it at `off` until the NVIDIA credential and AI runtime migration are deployed. The initial ARIA endpoint is designed for `advisory` mode only.

## NVIDIA provider

NVIDIA is the first provider in the pool. The adapter uses NVIDIA's OpenAI-compatible chat completions endpoint. Existing providers remain available as fallbacks.

Provider keys are server-side only and must never be exposed to browser code.

## First runtime surface

`POST /api/ai/aria/brief` requires an authenticated Operations user with an administrator, operator, or reviewer role. It reads leads, opportunities, invoices, recent audit activity, and pending approvals, then asks ARIA for a decision-ready briefing. No business write is performed by this endpoint.
