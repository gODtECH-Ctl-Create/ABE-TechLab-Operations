# AI Provider Setup

ARIA uses an optional provider pool. Providers are attempted in this order:

1. Gemini
2. Grok
3. OpenRouter
4. Cerebras
5. AgentRouter
6. OpenAI

A missing key does not fail the system. The provider is skipped and the next configured provider is attempted.

## Server-side environment variables

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROK_API_KEY=
GROK_MODEL=grok-4-fast-non-reasoning
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-8b-instruct:free
CEREBRAS_API_KEY=
CEREBRAS_MODEL=llama-3.3-70b
AGENTIC_API_KEY=
AGENTIC_API_BASE_URL=https://api.agentrouter.to/api/agentic-api
AGENTROUTER_MODEL=deepseek-v4-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Never expose these keys to browser code or commit them to GitHub.

## Operations UI

Open `/ai` in the Operations application to see configured providers, priority, model, request counts, failure rates, and AgentRouter wallet balance when `AGENTIC_API_KEY` is configured.

## Research worker

The production research request action now invokes `research-prospects-router`. The old `research-prospects` function remains in Supabase for compatibility, but new requests use the router function.
