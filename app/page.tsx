const metrics = [
  ["Leads", "0", "No website intake connected yet"],
  ["High-priority", "0", "AI qualification coming next"],
  ["Opportunities", "0", "No active opportunities yet"],
  ["Pending approvals", "0", "ARIA is advisory in v0.1"],
];

const activities = [
  ["Operations Core defined", "System", "Foundation documented"],
  ["ARIA operating boundary defined", "ARIA", "Approval-gated execution"],
  ["Lead lifecycle defined", "System", "New → Won / Lost / Nurture"],
];

export default function Dashboard() {
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
            <h1>Good morning. Here's the system.</h1>
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
          <div className="card">
            <h2>Recent activity</h2>
            <div className="list">
              {activities.map(([title, actor, note]) => (
                <div className="row" key={title}>
                  <div><strong>{title}</strong><small>{actor} · {note}</small></div>
                  <span className="badge">Recorded</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card aria" id="aria">
            <div className="eyebrow">AI intelligence layer</div>
            <h2>ARIA</h2>
            <div className="list">
              <div className="row"><div><strong>Advisory mode</strong><small>ARIA can analyse and recommend. External actions require approval.</small></div></div>
              <div className="row"><div><strong>Next capability</strong><small>Lead research and opportunity scoring.</small></div></div>
              <div className="row"><div><strong>System principle</strong><small>AI proposes → ABE TechLab reviews → approved actions execute.</small></div></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
