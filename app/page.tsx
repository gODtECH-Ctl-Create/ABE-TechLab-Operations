import { activities, leads, organisations } from "@/lib/data/mock-data";

const statusLabels: Record<string, string> = {
  new: "New",
  researching: "Researching",
  qualified: "Qualified",
  outreach_ready: "Outreach ready",
  contacted: "Contacted",
  engaged: "Engaged",
  opportunity: "Opportunity",
  won: "Won",
  lost: "Lost",
  nurture: "Nurture",
};

const organisationById = new Map(organisations.map((organisation) => [organisation.id, organisation]));

export default function Dashboard() {
  const highPriority = leads.filter((lead) => (lead.score ?? 0) >= 85).length;
  const activeOpportunities = leads.filter((lead) => ["qualified", "outreach_ready", "contacted", "engaged", "opportunity"].includes(lead.status)).length;
  const recommendations = activities.filter((activity) => activity.actorType === "aria").length;

  const metrics = [
    ["Leads", String(leads.length), "Development data for Operations Core"],
    ["High-priority", String(highPriority), "Scored 85 or above"],
    ["Opportunities", String(activeOpportunities), "Active pipeline records"],
    ["ARIA recommendations", String(recommendations), "Advisory mode"],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">ABE TechLab<span>Operations · v0.1</span></div>
        <nav className="nav" aria-label="Operations navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#leads">Leads</a>
          <a href="#opportunities">Opportunities</a>
          <a href="#organisations">Organisations</a>
          <a href="#research">Research</a>
          <a href="#outreach">Outreach</a>
          <a href="#content">Content</a>
          <a href="#aria">ARIA</a>
        </nav>
      </aside>

      <main className="main" id="dashboard">
        <header className="header">
          <div>
            <div className="eyebrow">Internal operations</div>
            <h1>Good morning. Here&apos;s the system.</h1>
          </div>
          <div className="status"><span className="dot" /> Operations online</div>
        </header>

        <section className="metrics" aria-label="Operations metrics">
          {metrics.map(([label, value, note]) => (
            <div className="card" key={label}>
              <div className="metric-label">{label}</div>
              <div className="metric-value">{value}</div>
              <div className="metric-note">{note}</div>
            </div>
          ))}
        </section>

        <section className="grid">
          <div className="card" id="leads">
            <div className="section-heading">
              <div><div className="eyebrow">Pipeline</div><h2>Priority leads</h2></div>
              <span className="badge">{leads.length} total</span>
            </div>
            <div className="list">
              {leads.map((lead) => {
                const organisation = organisationById.get(lead.organisationId);
                return (
                  <div className="row" key={lead.id}>
                    <div>
                      <strong>{organisation?.name ?? "Unknown organisation"}</strong>
                      <small>{lead.serviceInterest} · {statusLabels[lead.status]} · Score {lead.score ?? "—"}</small>
                      <small>{lead.problemSummary}</small>
                    </div>
                    <span className="badge">{lead.score && lead.score >= 85 ? "High fit" : "Review"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card aria" id="aria">
            <div className="eyebrow">AI intelligence layer</div>
            <h2>ARIA</h2>
            <div className="list">
              <div className="row"><div><strong>Advisory mode</strong><small>ARIA can analyse and recommend. External actions require approval.</small></div></div>
              <div className="row"><div><strong>Current signal</strong><small>{recommendations} recommendation recorded from the development dataset.</small></div></div>
              <div className="row"><div><strong>Next capability</strong><small>Research potential customers, qualify opportunities and prepare outreach plans.</small></div></div>
              <div className="row"><div><strong>Operating rule</strong><small>AI proposes → ABE TechLab reviews → approved actions execute.</small></div></div>
            </div>
          </div>
        </section>

        <section className="grid" id="organisations">
          <div className="card">
            <div className="section-heading"><div><div className="eyebrow">CRM</div><h2>Organisations</h2></div><span className="badge">{organisations.length} records</span></div>
            <div className="list">
              {organisations.map((organisation) => (
                <div className="row" key={organisation.id}>
                  <div><strong>{organisation.name}</strong><small>{organisation.industry} · {organisation.location}</small></div>
                  <span className="badge">{organisation.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" id="opportunities">
            <div className="section-heading"><div><div className="eyebrow">Activity</div><h2>Recent activity</h2></div></div>
            <div className="list">
              {activities.map((activity) => (
                <div className="row" key={activity.id}>
                  <div><strong>{activity.subject}</strong><small>{activity.actorType} · {activity.summary}</small></div>
                  <span className="badge">Recorded</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
