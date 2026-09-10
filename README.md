<a name="readme-top"></a>

<div align="center">

<img src="./docs/assets/operations-hero.svg" alt="ABE TechLab Operations animated control-plane hero" width="100%" />

<p>
  <img src="https://img.shields.io/badge/status-internal_platform-b7ff3c?style=for-the-badge&labelColor=17191c&color=b7ff3c" alt="Internal platform" />
  <img src="https://img.shields.io/badge/version-0.1.0-2563eb?style=for-the-badge" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/license-proprietary-b42318?style=for-the-badge" alt="Proprietary license" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/intelligence-ARIA-30420e?style=for-the-badge" alt="ARIA intelligence layer" />
</p>

### A governed internal operating system for intelligence-led operations.

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=18&duration=2400&pause=750&color=B7FF3C&center=true&vCenter=true&width=1000&lines=Signals+%E2%86%92+ARIA+%E2%86%92+Human+Approval+%E2%86%92+Controlled+Action;CRM+%7C+Research+%7C+Outreach+%7C+Content+%7C+Analytics;AI+proposes.+ABE+TechLab+reviews.+Approved+actions+execute.;One+control+plane+for+how+the+lab+operates." alt="Animated ABE TechLab Operations capabilities" />

<p>
  <a href="#-the-30-second-version">Overview</a> ·
  <a href="#-operating-model">Operating model</a> ·
  <a href="#-aria-intelligence-layer">ARIA</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-development">Development</a>
</p>

</div>

---

## ⚡ The 30-second version

**ABE TechLab Operations** is the internal operations platform that connects ABE TechLab's lead intelligence, customer relationship management (CRM), research, outreach, content operations, analytics, integrations, and the **ARIA** intelligence layer.

```text
SIGNALS + DATA
      ↓
OPERATIONS PLATFORM
      ↓
ARIA INTELLIGENCE
      ↓
HUMAN REVIEW / APPROVAL
      ↓
CONTROLLED EXTERNAL ACTION
      ↓
RESULTS RETURN TO OPERATIONS
```

The principle is simple:

> **AI proposes → ABE TechLab reviews → approved actions execute → results return.**

ARIA is the intelligence layer — **not the whole platform**. High-impact external actions remain approval-gated until the relevant automation is proven reliable.

<a href="#readme-top">↑ back to top</a>

---

## ✨ Operations surface

<table>
<tr>
<td width="50%" valign="top">

### 🗂️ CRM & pipeline
Organisations, contacts, leads, opportunities, activities, lead lifecycle, and operational dashboards.

### 🔎 Research
Organisation and market intelligence that feeds qualification, scoring, recommendations, and next actions.

### 📣 Outreach
Human-reviewed communication plans, drafts, follow-ups, and approval-aware execution.

</td>
<td width="50%" valign="top">

### 🧠 ARIA
Internal intelligence for research, classification, scoring, recommendations, drafting, monitoring, and governed action proposals.

### 📝 Content & attention
Operational content workflows plus surfaces for what needs attention, follow-up, or review.

### 🔌 Integrations
Website intake, email and future channels, analytics, GitHub, AI providers, and other operational services.

</td>
</tr>
</table>

<p align="center">
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,nodejs,postgres,supabase,vercel&perline=8" alt="ABE TechLab Operations technology stack" />
</p>

---

## 🔄 Operating model

```mermaid
flowchart LR
    S[Signals & data] --> O[Operations platform]
    O --> A[ARIA]

    A --> R[Research]
    A --> Q[Qualification & scoring]
    A --> D[Drafts & recommendations]
    A --> P[Action proposals]

    R --> H[ABE TechLab review]
    Q --> H
    D --> H
    P --> H

    H -->|Approved| X[Controlled action]
    H -->|Rejected / revised| A
    X --> E[External system]
    E --> F[Result / feedback]
    F --> O
```

This keeps intelligence useful without silently turning model output into business action.

---

## 🧠 ARIA intelligence layer

ARIA sits behind a shared AI gateway and provider router rather than being hard-wired to a single model provider.

```mermaid
flowchart TD
    ARIA[ARIA / Client Assistant] --> G[AI Gateway]
    G --> R[Provider Router]

    R --> N[NVIDIA NIM]
    R --> GM[Gemini]
    R --> GX[Grok]
    R --> OR[OpenRouter]
    R --> C[Cerebras]
    R --> AG[AgentRouter]
    R --> OA[OpenAI fallback]

    G --> POL[Runtime policy]
    R --> H[Provider health + failover]
    R --> U[Usage recording]
```

The gateway separates agent behavior from model transport. Provider configuration, failover, model selection, usage recording, and provider health remain replaceable behind the routing layer.

### Governance modes

| Mode | Behaviour |
| --- | --- |
| `off` | Model execution disabled for the selected surface |
| `advisory` | Read-only intelligence, analysis, and recommendations |
| `action` | Reserved for governed write-capable tools and approval-routed actions |

Internal ARIA and the customer-facing Client Assistant can be paused independently.

---

## 🏗️ Architecture

```mermaid
graph TD
    U[Authorised user] --> N[Next.js Operations app]

    N --> AUTH[Supabase Auth / session boundary]
    N --> DB[(Supabase PostgreSQL)]
    N --> API[Server APIs]
    N --> ARIA[ARIA workspace]

    ARIA --> GW[AI Gateway]
    GW --> PR[Provider Router]
    PR --> MODELS[Model providers]

    API --> APPROVAL[Approval queue]
    ARIA --> APPROVAL
    APPROVAL --> ACTION[Governed actions]

    WEB[Public website / external signals] --> API
    ACTION --> EXT[External systems]
    EXT --> API

    V[Vercel] --> N
```

### Technology stack

| Layer | Technology | Role |
| --- | --- | --- |
| Application | **Next.js 15** | Routing, UI, server APIs, application runtime |
| UI | **React 19** | Operations workspace and interactive surfaces |
| Language | **TypeScript 5** | Type-safe application code |
| Data & auth | **Supabase** | PostgreSQL, authentication, server/client data access |
| AI | **ARIA + shared gateway** | Internal intelligence and governed AI runtime |
| Hosting | **Vercel** | Production deployment, runtime, scheduled heartbeat |
| Quality | **ESLint + TypeScript + Vitest** | Linting, type-checking, and automated tests |

---

## 🎯 Operations Core v0.1

The first milestone is deliberately focused: build the smallest useful internal operating system before introducing autonomous execution.

```text
DASHBOARD
   ├── what is new?
   ├── what needs attention?
   ├── which opportunities matter most?
   ├── what is ARIA recommending?
   └── what happened recently?

CRM
   ├── organisations
   ├── contacts
   ├── leads
   ├── opportunities
   └── activities
```

Lead movement follows a defined lifecycle:

```text
New → Researching → Qualified → Outreach Ready → Contacted
    → Engaged → Opportunity → Won / Lost / Nurture
```

AI-generated scores are expected to retain the evidence and reasoning behind the score rather than becoming unexplained numbers.

---

## 💓 Supabase heartbeat

The application includes a lightweight health endpoint that performs a read against the isolated `system_heartbeat` table. It is infrastructure activity, not business-record creation.

```text
GET /api/health/supabase
```

A Vercel Cron configuration keeps the heartbeat available for scheduled infrastructure checks.

---

## 🚀 Development

Install dependencies and start the application:

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Production deployment is managed through **Vercel** from `main`. Build and type-check failures should be resolved before production changes are considered live.

---

## 📚 Internal documentation

| Document | Purpose |
| --- | --- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Core system architecture |
| [`docs/OPERATIONS-CORE-V0.1.md`](./docs/OPERATIONS-CORE-V0.1.md) | v0.1 product scope and success criteria |
| [`docs/AI_ARCHITECTURE.md`](./docs/AI_ARCHITECTURE.md) | AI gateway, provider router, ARIA boundaries |
| [`docs/AI_RUNTIME.md`](./docs/AI_RUNTIME.md) | AI runtime behaviour and policy |
| [`docs/AI_PROVIDER_SETUP.md`](./docs/AI_PROVIDER_SETUP.md) | Provider configuration guidance |
| [`docs/DATABASE-SCHEMA-V0.1.md`](./docs/DATABASE-SCHEMA-V0.1.md) | v0.1 database model |

---

## 🗺️ Roadmap

| Release | Focus |
| --- | --- |
| **Operations Core v0.1** | Auth, dashboard, CRM, lead pipeline, activity log, public lead intake, initial ARIA workspace |
| **ARIA v0.2** | Research, qualification, scoring, recommendations, outreach planning |
| **Automation v0.3** | Content, social publishing, email workflows, scheduled jobs, analytics |

Roadmap items describe direction, not a claim that every item is production-complete today.

---

## 🔐 Security & ownership

ABE TechLab Operations is a **private operational system in active development** even though the repository may be publicly viewable.

Security expectations include authenticated access, role-aware permissions, server-side secrets, auditability for material changes, separation of AI output from verified business facts, and approval gates around high-impact actions.

Never commit production credentials, provider API keys, Supabase privileged credentials, webhook secrets, or other private operational values. Deployment secrets belong in Vercel environment variables or an approved secrets manager.

This repository is **proprietary software**. Public GitHub access does not grant permission to reuse, redistribute, commercialise, or create derivative commercial systems from the code. See [`LICENSE`](./LICENSE) for the governing terms.

<div align="center">

<br />

**One control plane. Governed intelligence. Auditable operations.**

<a href="#readme-top">↑ back to top</a>

</div>
