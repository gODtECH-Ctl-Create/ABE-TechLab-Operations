import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!role) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="eyebrow">ABE TechLab Operations</div>
          <h1>Access pending</h1>
          <p>Your account is authenticated, but it has not been assigned an Operations role yet.</p>
          <small>Ask an administrator to assign you as an admin, operator, or reviewer.</small>
        </section>
      </main>
    );
  }

  const [leadsResult, organisationsResult, prospectsResult, activitiesResult] = await Promise.all([
    supabase.from("leads").select("id, organisation_id, service_interest, status, score, problem_summary").order("created_at", { ascending: false }).limit(20),
    supabase.from("organisations").select("id, name, industry, geography").order("created_at", { ascending: false }).limit(20),
    supabase.from("prospects").select("id, organisation_id, status, score, confidence, recommended_service, likely_need").order("created_at", { ascending: false }).limit(20),
    supabase.from("audit_events").select("id, actor_type, action, entity_type, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(12),
  ]);

  const leads = leadsResult.data ?? [];
  const organisations = organisationsResult.data ?? [];
  const prospects = prospectsResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const organisationById = new Map(organisations.map((organisation) => [organisation.id, organisation]));

  const highPriority = leads.filter((lead) => (lead.score ?? 0) >= 85).length;
  const activeOpportunities = leads.filter((lead) => ["qualified", "outreach_ready", "contacted", "engaged", "opportunity"].includes(lead.status)).length;
  const ariaEvents = activities.filter((activity) => activity.actor_type === "aria").length;

  const metrics = [
    ["Leads", String(leads.length), "Live Supabase records"],
    ["High-priority", String(highPriority), "Scored 85 or above"],
    ["Opportunities", String(activeOpportunities), "Active pipeline records"],
    ["Prospects", String(prospects.length), "Research-backed prospects"],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">ABE TechLab<span>Operations · v0.1 · {role.role}</span></div>
        <nav className="nav" aria-label="Operations navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#leads">Leads</a>
          <a href="#opportunities">Opportunities</a>
          <a href="#organisations">Organisations</a>
          <a href="#research">Research</a>
          <a href="#outreach">Outreach</a>
          <a href="#aria">ARIA</a>
        </nav>
      </aside>

      <main className="main" id="dashboard">
        <header className="header">
          <div>
            <div className="eyebrow">Internal operations</div>
            <h1>Good morning. Here&apos;s the system.</h1>
            <p className="header-subtitle">Live data connection · {user.email}</p>
          </div>
          <div className="status"><span className="dot" /> Supabase connected</div>
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
            <div className="section-heading"><div><div className="eyebrow">Pipeline</div><h2>Priority leads</h2></div><span className="badge">{leads.length} total</span></div>
            <div className="list">
              {leads.length === 0 ? <div className="empty-stage">No leads yet. Research and qualification will populate this view.</div> : leads.map((lead) => {
                const organisation = organisationById.get(lead.organisation_id);
                return <div className="row" key={lead.id}><div><strong>{organisation?.name ?? "Unknown organisation"}</strong><small>{lead.service_interest ?? "Service not assigned"} · {statusLabels[lead.status] ?? lead.status} · Score {lead.score ?? "—"}</small><small>{lead.problem_summary ?? "No problem summary recorded yet."}</small></div><span className="badge">{lead.score && lead.score >= 85 ? "High fit" : "Review"}</span></div>;
              })}
            </div>
          </div>

          <div className="card aria" id="aria">
            <div className="eyebrow">AI intelligence layer</div><h2>ARIA</h2>
            <div className="list">
              <div className="row"><div><strong>Advisory mode</strong><small>ARIA can analyse and recommend. External actions require approval.</small></div></div>
              <div className="row"><div><strong>Audit activity</strong><small>{ariaEvents} ARIA action{ariaEvents === 1 ? "" : "s"} recorded in the live database.</small></div></div>
              <div className="row"><div><strong>Next capability</strong><small>Research potential customers, qualify opportunities and prepare outreach plans.</small></div></div>
              <div className="row"><div><strong>Operating rule</strong><small>AI proposes → ABE TechLab reviews → approved actions execute.</small></div></div>
            </div>
          </div>
        </section>

        <section className="grid" id="organisations">
          <div className="card">
            <div className="section-heading"><div><div className="eyebrow">CRM</div><h2>Organisations</h2></div><span className="badge">{organisations.length} records</span></div>
            <div className="list">
              {organisations.length === 0 ? <div className="empty-stage">No organisations recorded yet.</div> : organisations.map((organisation) => <div className="row" key={organisation.id}><div><strong>{organisation.name}</strong><small>{organisation.industry ?? "Industry not set"} · {organisation.geography ?? "Location not set"}</small></div><span className="badge">Live</span></div>)}
            </div>
          </div>

          <div className="card" id="opportunities">
            <div className="section-heading"><div><div className="eyebrow">Audit trail</div><h2>Recent activity</h2></div></div>
            <div className="list">
              {activities.length === 0 ? <div className="empty-stage">No audit activity yet.</div> : activities.map((activity) => <div className="row" key={activity.id}><div><strong>{activity.action}</strong><small>{activity.actor_type} · {activity.entity_type} · {new Date(activity.created_at).toLocaleString()}</small></div><span className="badge">Recorded</span></div>)}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
