import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProviderDashboard } from "@/lib/ai/provider-router";
import "./ai.css";

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
  const healthyProviders = providers.filter((p) => p.configured && p.failureRate24h < 10).length;

  return (
    <main className="page-shell ai-control">
      <header className="page-header">
        <div><div className="eyebrow">Intelligence · Control plane</div><h1>AI Control Centre</h1><p>Monitor provider health, failover behavior, usage and routing without exposing provider credentials to the client.</p></div>
        <a className="ghost-button" href="/">← Dashboard</a>
      </header>

      <section className="ai-hero">
        <div className="ai-hero-card">
          <div className="ai-hero-eyebrow">ARIA intelligence layer</div>
          <h2 className="ai-hero-title">AI execution is paused</h2>
          <p className="ai-hero-copy">The Operations platform remains fully usable while model execution is paused. Research requests, human review and outbound preparation continue without depending on an active provider.</p>
          <span className="ai-mode"><span className="ai-mode-dot" /> Execution paused · Safe mode</span>
        </div>
        <div className="ai-signal">
          <div className="eyebrow">System signal</div>
          <h2>Provider posture</h2>
          <p>{configured} of {providers.length} providers are configured. The router can resume later without changing the Operations workflow.</p>
          <div className="ai-signal-grid">
            <div className="ai-signal-item"><span>Configured</span><strong>{configured}/{providers.length}</strong></div>
            <div className="ai-signal-item"><span>Healthy</span><strong>{healthyProviders}</strong></div>
            <div className="ai-signal-item"><span>24h requests</span><strong>{requests}</strong></div>
            <div className="ai-signal-item"><span>24h failures</span><strong>{failures}</strong></div>
          </div>
        </div>
      </section>

      <section className="table-card">
        <div className="section-heading"><div><div className="eyebrow">Provider pool</div><h2>Failover order</h2><p>Configured providers are tried in priority order. Missing credentials are skipped.</p></div><span className="badge">1 → {providers.length}</span></div>
        <div className="ai-provider-list">
          {providers.map((provider) => {
            const healthy = provider.configured && provider.failureRate24h < 10;
            return <div className="ai-provider-row" key={provider.name}>
              <div className="ai-rank">{provider.priority}</div>
              <div className="ai-provider-main"><strong>{provider.label}</strong><span>{provider.model}</span></div>
              <span className={`ai-status ${healthy ? "good" : provider.configured ? "warn" : "warn"}`}><span className="dot" />{provider.configured ? (healthy ? "Configured · healthy" : "Configured · watch") : "Not configured"}</span>
              <div className="ai-stat"><strong>{provider.requests24h}</strong><span>requests / 24h</span></div>
              <div className="ai-stat"><strong>{provider.failureRate24h}%</strong><span>failure rate</span></div>
            </div>;
          })}
        </div>
      </section>

      <section className="table-card">
        <div className="section-heading"><div><div className="eyebrow">Governance</div><h2>How the AI layer behaves</h2><p>The control centre describes system behavior without requiring AI execution to be available.</p></div></div>
        <div className="ai-rule-grid">
          <article className="ai-rule"><strong>1. Propose</strong><p>AI can generate research, qualification or outreach proposals when execution is enabled.</p></article>
          <article className="ai-rule"><strong>2. Review</strong><p>Human reviewers remain the gate before proposals affect the operational workflow.</p></article>
          <article className="ai-rule"><strong>3. Execute</strong><p>Approved actions can execute through the relevant operational provider layer.</p></article>
        </div>
        <div className="ai-warning" style={{marginTop:"12px"}}><div><strong>Current state: paused.</strong><span>Do not expect research requests to invoke models until a provider is restored and execution is enabled.</span></div></div>
        {agentRouter.error && <div className="ai-warning" style={{marginTop:"10px"}}><div><strong>AgentRouter warning</strong><span>{agentRouter.error}</span></div></div>}
        <p className="ai-footer-note" style={{marginTop:"12px"}}>Provider credentials remain server-side. This page intentionally exposes status and operational posture, not secret values.</p>
      </section>
    </main>
  );
}
