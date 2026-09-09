"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratedBrief } from "@/components/generated-brief";

type BriefResponse = {
  ok: boolean;
  requestId: string;
  provider: string;
  model: string;
  text: string;
  tools: string[];
  fallbackUsed: boolean;
  error?: string;
};

type RecentRun = {
  id: string;
  status: string;
  provider: string | null;
  model: string | null;
  created_at: string;
};

const toolLabels: Record<string, string> = {
  get_leads: "Leads",
  get_opportunities: "Opportunities",
  get_invoices: "Invoices",
  get_recent_activity: "Recent activity",
  get_pending_approvals: "Pending approvals",
  get_runtime: "Runtime policy",
};

export function AriaBriefing({ initialRuns }: { initialRuns: RecentRun[] }) {
  const router = useRouter();
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateBrief() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/aria/brief", { method: "POST" });
      const payload = await response.json() as BriefResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || "ARIA could not prepare the briefing.");
      setBrief(payload);
      setGeneratedAt(new Date().toLocaleString());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ARIA could not prepare the briefing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="aria-hero">
        <div className="aria-hero-copy">
          <span className="aria-presence"><i /> ARIA · Operations intelligence</span>
          <h2>Your decision brief, grounded in live Operations data.</h2>
          <p>ARIA reviews the current commercial and operational picture, highlights what needs attention, and recommends the next priorities. It cannot execute consequential actions.</p>
          <div className="aria-hero-actions">
            <button className="primary-button aria-generate" type="button" onClick={generateBrief} disabled={busy}>
              <span aria-hidden="true">✦</span>{busy ? "Reviewing Operations…" : brief ? "Refresh operations brief" : "Generate operations brief"}
            </button>
            <span className="aria-readonly">Read-only · Human governed</span>
          </div>
        </div>
        <div className="aria-orbit" aria-hidden="true"><span>ARIA</span><i /><i /><i /></div>
      </section>

      {error ? <div className="error-banner aria-error" role="alert"><strong>ARIA could not complete this run.</strong><span>{error}</span><button type="button" onClick={generateBrief}>Try again</button></div> : null}

      <section className="aria-workspace-grid">
        <article className="card aria-output-card" aria-live="polite" aria-busy={busy}>
          <div className="section-heading">
            <div><div className="eyebrow">Current briefing</div><h2>{brief ? "ARIA operations brief" : "Ready when you are"}</h2><p>{brief ? `Generated ${generatedAt}` : "Generate a brief to assess the latest data across the workspace."}</p></div>
            {brief ? <span className={`status-chip ${brief.fallbackUsed ? "warning" : "success"}`}>{brief.fallbackUsed ? "Fallback used" : "Primary route"}</span> : null}
          </div>
          {busy ? <div className="aria-loading"><span className="aria-loading-mark">✦</span><div><strong>ARIA is reviewing the workspace</strong><span>Checking pipeline, finance, approvals, and recent activity…</span></div><i /></div> : brief ? <GeneratedBrief>{brief.text}</GeneratedBrief> : <div className="aria-empty"><span>✦</span><strong>No briefing generated yet</strong><p>This is a live AI request. ARIA will use only the operational records it can access and will record the run for auditability.</p></div>}
        </article>

        <aside className="aria-context-column">
          <section className="card aria-context-card">
            <div className="eyebrow">Evidence scope</div><h2>What ARIA reviews</h2>
            <div className="aria-source-list">{["Leads and fit signals", "Opportunities and pipeline risk", "Invoices and payment position", "Pending human approvals", "Recent auditable activity"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div>
          </section>
          {brief ? <section className="card aria-run-card"><div className="eyebrow">Run details</div><dl><div><dt>Provider</dt><dd>{brief.provider}</dd></div><div><dt>Model</dt><dd>{brief.model}</dd></div><div><dt>Request</dt><dd title={brief.requestId}>{brief.requestId.slice(0, 8)}…</dd></div><div><dt>Data sources</dt><dd>{brief.tools.length}</dd></div></dl><div className="aria-tools">{brief.tools.map((tool) => <span key={tool}>{toolLabels[tool] ?? tool}</span>)}</div></section> : null}
        </aside>
      </section>

      <section className="card aria-history-card">
        <div className="section-heading"><div><div className="eyebrow">Audit visibility</div><h2>Recent ARIA runs</h2><p>Latest briefing activity recorded by the AI runtime.</p></div><span className="badge">{initialRuns.length} recent</span></div>
        {initialRuns.length ? <div className="aria-history-list">{initialRuns.map((run) => <div key={run.id}><span className={`status-chip ${run.status === "completed" ? "success" : run.status === "failed" ? "failed" : "info"}`}>{run.status}</span><strong>{run.provider ?? "Provider pending"}</strong><span>{run.model ?? "Model pending"}</span><time>{new Date(run.created_at).toLocaleString()}</time></div>)}</div> : <div className="empty-stage"><strong>No ARIA runs yet</strong><span>Your first completed or failed run will appear here.</span></div>}
      </section>
    </>
  );
}
