import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProviderDashboard } from "@/lib/ai/provider-router";
import "../../../ai/ai.css";

export default async function AiProviderSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : String(roleResult.data ?? "");
  if (!["admin", "operator", "reviewer"].includes(role ?? "")) redirect("/");

  const dashboard = await getAiProviderDashboard();
  const { providers, agentRouter } = dashboard;
  const configured = providers.filter((provider) => provider.configured).length;
  const failures = providers.reduce((sum, provider) => sum + provider.failures24h, 0);
  const requests = providers.reduce((sum, provider) => sum + provider.requests24h, 0);

  return <main className="page-shell ai-control">
    <header className="page-header">
      <div><div className="eyebrow">Settings · Integrations · AI Providers</div><h1>AI Control Centre</h1><p>Review provider posture, routing order, observed usage and failures. Model execution remains intentionally paused.</p></div>
      <a className="ghost-button" href="/settings/integrations">← Integrations</a>
    </header>
    <section className="lead-summary">
      <div className="summary-card"><span>Configured</span><strong>{configured}/{providers.length}</strong></div>
      <div className="summary-card"><span>Requests / 24h</span><strong>{requests}</strong></div>
      <div className="summary-card"><span>Failures / 24h</span><strong>{failures}</strong></div>
      <div className="summary-card"><span>Execution</span><strong>Paused</strong></div>
    </section>
    <section className="table-card">
      <div className="section-heading"><div><div className="eyebrow">Provider pool</div><h2>Provider posture</h2><p>Credentials are never displayed here. Missing providers are skipped when execution is enabled.</p></div></div>
      <div className="ai-provider-list">{providers.map((provider) => {
        const observed = provider.configured && provider.requests24h > 0;
        const watch = observed && provider.failureRate24h >= 10;
        const statusClass = !provider.configured ? "warn" : !observed ? "muted" : watch ? "warn" : "good";
        const statusLabel = !provider.configured ? "Not configured" : !observed ? "Configured · idle" : watch ? "Observed · watch" : "Observed · healthy";
        return <div className="ai-provider-row" key={provider.name}>
          <div className="ai-rank">{provider.priority}</div><div className="ai-provider-main"><strong>{provider.label}</strong><span>{provider.model}</span></div>
          <span className={`ai-status ${statusClass}`}><span className="dot" />{statusLabel}</span>
          <div className="ai-stat"><strong>{provider.requests24h}</strong><span>requests / 24h</span></div>
          <div className="ai-stat"><strong>{provider.failureRate24h}%</strong><span>failure rate</span></div>
        </div>;
      })}</div>
    </section>
    <section className="table-card"><div className="section-heading"><div><div className="eyebrow">Governance</div><h2>AI operating rules</h2></div></div><div className="ai-rule-grid"><article className="ai-rule"><strong>Propose</strong><p>AI may produce structured recommendations when execution is enabled.</p></article><article className="ai-rule"><strong>Review</strong><p>Humans remain the gate for consequential workflow actions.</p></article><article className="ai-rule"><strong>Execute</strong><p>Only approved actions reach external providers.</p></article></div>{agentRouter.error && <div className="ai-warning ai-warning-spaced"><div><strong>AgentRouter warning</strong><span>{agentRouter.error}</span></div></div>}</section>
  </main>;
}
