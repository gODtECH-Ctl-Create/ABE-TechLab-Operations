# AI Provider Setup

ARIA and the Client Assistant use the same server-side provider pool through `lib/ai/gateway.ts`. Agent semantics stay separate while transport, failover and telemetry remain shared.

Providers are attempted in priority order and missing credentials are skipped safely.

## Server-side environment variables

```text
AI_RUNTIME_MODE=off
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROK_API_KEY=
GROK_MODEL=grok-4-fast-non-reasoning
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-8b-instruct:free
CEREBRAS_API_KEY=
CEREBRAS_MODEL=llama-3.3-70b
AGENT_ROUTER_API_KEY=
AGENTROUTER_MODEL=deepseek-v4-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Never expose these keys to browser code or commit them to GitHub.

## Runtime modes

- `off`: no model execution. This is the default and the safe baseline.
- `advisory`: read-only intelligence and recommendations.
- `action`: reserved for the later controlled tool-execution phase. Do not enable it for the initial ARIA slice.

## AI gateway surfaces

- `aria_internal`: internal Operations intelligence. The first enabled surface is the read-only operations brief.
- `client_assistant`: customer-facing service discovery and conversation runtime. Existing per-conversation `ai_enabled` state remains respected.

Both surfaces share provider routing and usage telemetry, but they do not share prompts, business responsibilities, or action policies.

## Operations UI

Open `/settings/integrations/ai` to review provider configuration, recent usage, failures, and the active runtime mode.

## First ARIA endpoint

`POST /api/ai/aria/brief` requires an authenticated Operations user and returns a read-only briefing based on current leads, opportunities, invoices, recent audit activity, and pending approvals.
