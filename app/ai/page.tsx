import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProviderDashboard } from "@/lib/ai/provider-router";

export default async function AiControlCentre() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : String(roleResult.data ?? "");
  const allowedRoles = ["admin", "operator", "reviewer"] as const;
  if (role === null || !allowedRoles.includes(role as (typeof allowedRoles)[number])) redirect("/");

  const dashboard = await getAiProviderDashboard();
  const { providers, agentRouter } = dashboard;
  const configured = providers.filter((p) => p.configured).length;
  const failures = providers.reduce((sum, p) => sum + p.failures24h, 0);
  const requests = providers.reduce((sum, p) => sum + p.requests24h, 0);

  return (
    <main className="dashboard-shell">
      <header className="page-header">
        <div><div className="eyebrow">Intelligence</div><h1>AI Control Centre</h1><p>Monitor provider availability, failover activity, usage, and AgentRouter credits.</p></div>
        <a className="secondary-button" href="/">Back to operations</a>
      </header>

      <section className="metric-grid">
        <div className="metric-card"><span>Configured providers</span><strong>{configured}/6</strong><small>Optional keys can safely remain empty.</small></div>
        <div className="metric-card"><span>Requests, 24h</span><strong>{requests}</strong><small>Across the provider pool.</small></div>
        <div className="metric-card"><span>Failures, 24h</span><strong>{failures}</strong><small>Failed providers are skipped and the next configured provider is tried.</small></div>
        <div className="metric-card"><span>AgentRouter wallet</span><strong>{agentRouter.balanceUsd == null ? "Not configured" : `$${agentRouter.balanceUsd.toFixed(2)}`}</strong><small>{agentRouter.balanceCredits == null ? "Add AGENTIC_API_KEY to enable wallet monitoring." : `${agentRouter.balanceCredits.toLocaleString()} credits remaining`}</small></div>
      </section>

      <section className="table-card">
        <div className="section-heading"><div><div className="eyebrow">Provider pool</div><h2>Failover order</h2></div><span className="muted">1 → 6</span></div>
        <div className="provider-list">
          {providers.map((provider) => (
            <div className="provider-row" key={provider.name}>
              <div className="provider-rank">{provider.priority}</div>
              <div className="provider-main"><strong>{provider.label}</strong><span>{provider.model}</span></div>
              <div className={`status-pill ${provider.configured ? "status-good" : "status-muted"}`}>{provider.configured ? "Configured" : "Not configured"}</div>
              <div className="provider-stat"><strong>{provider.requests24h}</strong><span>requests</span></div>
              <div className="provider-stat"><strong>{provider.failureRate24h}%</strong><span>failure rate</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="table-card">
        <div className="section-heading"><div><div className="eyebrow">Operations</div><h2>Provider rules</h2></div></div>
        <div className="callout"><strong>Empty keys do not break ARIA.</strong><p>A provider is skipped when its server-side key is absent. ARIA attempts only configured providers in priority order. OpenAI remains the final fallback.</p></div>
        <div className="callout"><strong>Usage is tracked.</strong><p>Every attempt records provider, task, result, duration, token usage where supplied, and errors in the AI provider usage ledger.</p></div>
        {agentRouter.error && <div className="callout"><strong>AgentRouter warning</strong><p>{agentRouter.error}</p></div>}
      </section>
    </main>
  );
}
