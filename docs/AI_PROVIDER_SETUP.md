# AI Provider Setup

ARIA uses a server-side provider pool. Providers are attempted in priority order and missing credentials are skipped safely.

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

## Operations UI

Open `/settings/integrations/ai` to review provider configuration and usage posture.

## First ARIA endpoint

`POST /api/ai/aria/brief` requires an authenticated Operations user and returns a read-only briefing based on current leads, opportunities, invoices, recent audit activity, and pending approvals.
