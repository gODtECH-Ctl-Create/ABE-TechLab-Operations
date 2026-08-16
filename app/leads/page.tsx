import { leads, organisations } from "../../lib/data/mock-data";
import type { LeadStatus } from "../../lib/data/types";

const stages: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "researching", label: "Researching" },
  { id: "qualified", label: "Qualified" },
  { id: "outreach_ready", label: "Outreach ready" },
  { id: "contacted", label: "Contacted" },
  { id: "engaged", label: "Engaged" },
  { id: "opportunity", label: "Opportunity" },
];

function organisationName(id: string) {
  return organisations.find((organisation) => organisation.id === id)?.name ?? "Unknown organisation";
}

export default function LeadsPage() {
  const activeLeads = leads.filter((lead) => !["won", "lost", "nurture"].includes(lead.status));
  const highPriority = leads.filter((lead) => (lead.score ?? 0) >= 85);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">CRM · Lead management</div>
          <h1>Leads</h1>
          <p>Find, qualify and move potential customers toward the right ABE TechLab service.</p>
        </div>
        <button className="primary-button">+ New lead</button>
      </header>

      <section className="lead-summary">
        <div className="summary-card"><span>Active leads</span><strong>{activeLeads.length}</strong></div>
        <div className="summary-card"><span>High priority</span><strong>{highPriority.length}</strong></div>
        <div className="summary-card"><span>Won</span><strong>{leads.filter((lead) => lead.status === "won").length}</strong></div>
      </section>

      <section className="card pipeline-card">
        <div className="section-heading">
          <div><h2>Lead pipeline</h2><p>Development records for the current build. Production data will come from Supabase.</p></div>
        </div>
        <div className="pipeline">
          {stages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.status === stage.id);
            return (
              <div className="pipeline-column" key={stage.id}>
                <div className="pipeline-title"><span>{stage.label}</span><b>{stageLeads.length}</b></div>
                {stageLeads.map((lead) => (
                  <article className="lead-card" key={lead.id}>
                    <div className="lead-score">{lead.score ?? "--"}</div>
                    <h3>{organisationName(lead.organisationId)}</h3>
                    <p>{lead.serviceInterest ?? "Service not yet identified"}</p>
                    {lead.nextAction && <small>Next: {lead.nextAction}</small>}
                  </article>
                ))}
                {stageLeads.length === 0 && <div className="empty-stage">No leads</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="lead-details-grid">
        {highPriority.map((lead) => (
          <article className="card lead-detail" key={lead.id}>
            <div className="eyebrow">ARIA qualification</div>
            <div className="detail-top"><h2>{organisationName(lead.organisationId)}</h2><span className="score-pill">{lead.score}/100</span></div>
            <p>{lead.problemSummary}</p>
            <div className="evidence"><strong>Why this score?</strong>{lead.scoreReasons?.map((reason) => <span key={reason}>✓ {reason}</span>)}</div>
            <div className="recommended"><strong>Recommended next action</strong><span>{lead.nextAction}</span></div>
          </article>
        ))}
      </section>
    </main>
  );
}
