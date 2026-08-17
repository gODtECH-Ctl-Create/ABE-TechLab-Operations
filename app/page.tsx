import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

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

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];
type UserRole = "admin" | "operator" | "reviewer";

const funnelStages = [
  { key: "researching", label: "Research", color: "neutral" },
  { key: "qualified", label: "Qualified", color: "blue" },
  { key: "outreach_ready", label: "Outreach", color: "violet" },
  { key: "engaged", label: "Engaged", color: "amber" },
  { key: "opportunity", label: "Opportunity", color: "green" },
  { key: "won", label: "Won", color: "green" },
];

export default async function Dashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleValue, error: roleError } = await supabase.rpc("get_my_role" as never);
  const userRole = roleError ? undefined : (roleValue as UserRole | null | undefined);

  if (!userRole || !["admin", "operator", "reviewer"].includes(userRole)) {
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
    supabase.from("leads").select("id, organisation_id, service_interest, status, score, problem_summary").order("created_at", { ascending: false }).limit(50),
    supabase.from("organisations").select("id, name, industry, geography").order("created_at", { ascending: false }).limit(50),
    supabase.from("prospects").select("id, organisation_id, status, score, confidence, recommended_service, likely_need").order("created_at", { ascending: false }).limit(50),
    supabase.from("audit_events").select("id, actor_type, action, entity_type, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (organisationsResult.error) throw new Error(organisationsResult.error.message);
  if (prospectsResult.error) throw new Error(prospectsResult.error.message);
  if (activitiesResult.error) throw new Error(activitiesResult.error.message);

  const leads = (leadsResult.data ?? []) as Pick<Lead, "id" | "organisation_id" | "service_interest" | "status" | "score" | "problem_summary">[];
  const organisations = (organisationsResult.data ?? []) as Pick<Organisation, "id" | "name" | "industry" | "geography">[];
  const prospects = (prospectsResult.data ?? []) as Pick<Prospect, "id" | "organisation_id" | "status" | "score" | "confidence" | "recommended_service" | "likely_need">[];
  const activities = (activitiesResult.data ?? []) as Pick<AuditEvent, "id" | "actor_type" | "action" | "entity_type" | "entity_id" | "metadata" | "created_at">[];

  const organisationById = new Map<string, (typeof organisations)[number]>();
  for (const organisation of organisations) organisationById.set(organisation.id, organisation);

  const highPriority = leads.filter((lead) => (lead.score ?? 0) >= 85).length;
  const activeOpportunities = leads.filter((lead) => ["qualified", "outreach_ready", "contacted", "engaged", "opportunity"].includes(lead.status)).length;
  const ariaEvents = activities.filter((activity) => activity.actor_type === "aria").length;
  const engagedLeads = leads.filter((lead) => ["engaged", "opportunity", "won"].includes(lead.status)).length;
  const conversionRate = leads.length ? Math.round((engagedLeads / leads.length) * 100) : 0;
  const funnelCounts = funnelStages.map((stage) => leads.filter((lead) => lead.status === stage.key).length);
  const topProspects = [...prospects].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4);

  const quickActions = [
    { href: "/prospecting", label: "Research prospects", note: "Find high-fit organisations" },
    { href: "/leads", label: "Review leads", note: `${highPriority} high-priority to inspect` },
    { href: "/outreach", label: "Prepare outreach", note: "Build approved sequences" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-mark"><span className="brand-dot" /> ABE TechLab</div>
        <div className="workspace-label">Operations <span>v0.1</span></div>
        <nav className="nav" aria-label="Operations navigation">
          <div className="nav-group">
            <span className="nav-label">Overview</span>
            <a className="active" href="#dashboard">Dashboard</a>
          </div>
          <div className="nav-group">
            <span className="nav-label">Revenue engine</span>
            <a href="#leads">Leads</a>
            <a href="#opportunities">Opportunities</a>
            <a href="#outreach">Outreach</a>
          </div>
          <div className="nav-group">
            <span className="nav-label">Intelligence</span>
            <a href="#research">Research</a>
            <a href="#aria">ARIA</a>
          </div>
          <div className="nav-group">
            <span className="nav-label">Customer system</span>
            <a href="#organisations">Organisations</a>
          </div>
        </nav>
        <div className="sidebar-footer"><span className="online-dot" /> Live operations<br /><small>{user.email}</small></div>
      </aside>

      <main className="main" id="dashboard">
        <header className="header dashboard-header">
          <div>
            <div className="eyebrow">Internal operations · {userRole}</div>
            <h1>Good morning, Ayo.</h1>
            <p className="header-subtitle">Here is what needs attention across your revenue engine.</p>
          </div>
          <div className="header-actions">
            <span className="connection"><span className="dot" /> Supabase connected</span>
            <a className="ghost-button" href="#aria">Open ARIA</a>
          </div>
        </header>

        <section className="command-bar" aria-label="Quick actions">
          <div><strong>What should we do next?</strong><span>Start from the highest-value action.</span></div>
          <div className="quick-actions">
            {quickActions.map((action) => <a className="quick-action" href={action.href} key={action.href}><span>{action.label}</span><small>{action.note}</small><b>→</b></a>)}
          </div>
        </section>

        <section className="metrics" aria-label="Operations metrics">
          <div className="metric-card featured"><div className="metric-label">Pipeline leads</div><div className="metric-value">{leads.length}</div><div className="metric-foot"><span>Current pipeline</span><span className="trend">{conversionRate}% engaged</span></div></div>
          <div className="metric-card"><div className="metric-label">High priority</div><div className="metric-value">{highPriority}</div><div className="metric-foot"><span>Score 85+</span><span>Review now</span></div></div>
          <div className="metric-card"><div className="metric-label">Opportunities</div><div className="metric-value">{activeOpportunities}</div><div className="metric-foot"><span>Active pipeline</span><span>Open →</span></div></div>
          <div className="metric-card"><div className="metric-label">Prospects</div><div className="metric-value">{prospects.length}</div><div className="metric-foot"><span>Research-backed</span><span>Live</span></div></div>
        </section>

        <section className="dashboard-grid top-grid">
          <div className="card pipeline-card" id="opportunities">
            <div className="section-heading"><div><div className="eyebrow">Revenue engine</div><h2>Pipeline health</h2><p>Where prospects are moving and where attention is needed.</p></div><a className="text-link" href="/leads">View pipeline →</a></div>
            <div className="funnel">
              {funnelStages.map((stage, index) => {
                const count = funnelCounts[index];
                const max = Math.max(...funnelCounts, 1);
                return <div className="funnel-row" key={stage.key}><span className={`funnel-dot ${stage.color}`} /><strong>{stage.label}</strong><div className="funnel-track"><span style={{ width: `${Math.max(count ? (count / max) * 100 : 3, 3)}%` }} /></div><b>{count}</b></div>;
              })}
            </div>
            {leads.length === 0 ? <div className="inline-empty"><strong>Your pipeline is empty.</strong><span>Run research to create the first prospect set.</span><a href="/prospecting">Start prospect research →</a></div> : null}
          </div>

          <div className="card aria-card" id="aria">
            <div className="aria-top"><div><div className="eyebrow">AI intelligence layer</div><h2>ARIA</h2></div><span className="mode-pill">Advisory mode</span></div>
            <div className="aria-brief"><span className="aria-icon">✦</span><div><strong>Today&apos;s intelligence</strong><p>{prospects.length ? `${topProspects.length} prospects are ready for review based on current fit signals.` : "There is no research set yet. ARIA is ready to discover potential customers."}</p></div></div>
            <div className="aria-stats"><div><b>{ariaEvents}</b><span>AI actions</span></div><div><b>{highPriority}</b><span>High-fit leads</span></div><div><b>{engagedLeads}</b><span>Engaged</span></div></div>
            <a className="aria-action" href="#research">Review recommendations <span>→</span></a>
            <div className="approval-note">AI proposes → ABE TechLab reviews → approved actions execute.</div>
          </div>
        </section>

        <section className="dashboard-grid bottom-grid">
          <div className="card" id="leads">
            <div className="section-heading"><div><div className="eyebrow">Prioritize</div><h2>What needs attention</h2><p>Highest-fit records first, so the team knows where to act.</p></div><a className="text-link" href="/leads">All leads →</a></div>
            <div className="attention-list">
              {leads.length === 0 ? <div className="empty-stage"><strong>No leads to prioritize</strong><span>Research and qualification will populate this view.</span><a href="/prospecting">Find prospects →</a></div> : leads.slice(0, 5).map((lead) => { const organisation = organisationById.get(lead.organisation_id); return <div className="attention-row" key={lead.id}><div className="rank">{(lead.score ?? 0) >= 85 ? "High" : "Open"}</div><div className="attention-main"><strong>{organisation?.name ?? "Unknown organisation"}</strong><span>{lead.service_interest ?? "Service not assigned"} · {statusLabels[lead.status] ?? lead.status}</span></div><div className="score">{lead.score ?? "—"}<small>fit</small></div><span className="chevron">→</span></div>; })}
            </div>
          </div>

          <div className="card" id="research">
            <div className="section-heading"><div><div className="eyebrow">Research queue</div><h2>Top prospects</h2><p>Research-backed opportunities worth investigating.</p></div><a className="text-link" href="/prospecting">Research →</a></div>
            <div className="prospect-list">
              {topProspects.length === 0 ? <div className="empty-stage"><strong>No prospects yet</strong><span>ARIA can research potential customers and prepare qualification signals.</span><a href="/prospecting">Start research →</a></div> : topProspects.map((prospect) => { const organisation = organisationById.get(prospect.organisation_id); return <div className="prospect-row" key={prospect.id}><div className="prospect-avatar">{(organisation?.name ?? "?").slice(0, 1).toUpperCase()}</div><div><strong>{organisation?.name ?? "Unknown organisation"}</strong><span>{prospect.recommended_service ?? "Service opportunity"}</span></div><b>{prospect.score ?? "—"}</b></div>; })}
            </div>
          </div>
        </section>

        <section className="dashboard-grid activity-grid" id="organisations">
          <div className="card"><div className="section-heading"><div><div className="eyebrow">Customer system</div><h2>Organisations</h2><p>Accounts currently known to the Operations system.</p></div><span className="badge">{organisations.length} records</span></div><div className="compact-list">{organisations.length === 0 ? <div className="empty-stage"><span>No organisations recorded yet.</span></div> : organisations.slice(0, 5).map((organisation) => <div className="compact-row" key={organisation.id}><div><strong>{organisation.name}</strong><span>{organisation.industry ?? "Industry not set"} · {organisation.geography ?? "Location not set"}</span></div><span className="status-chip">Live</span></div>)}</div></div>
          <div className="card" id="outreach"><div className="section-heading"><div><div className="eyebrow">Control</div><h2>Recent activity</h2><p>Auditable actions across the system.</p></div><a className="text-link" href="#outreach">Audit trail →</a></div><div className="compact-list">{activities.length === 0 ? <div className="empty-stage"><span>No audit activity yet.</span></div> : activities.map((activity) => <div className="compact-row" key={activity.id}><div><strong>{activity.action}</strong><span>{activity.actor_type} · {activity.entity_type} · {new Date(activity.created_at).toLocaleString()}</span></div><span className="status-chip">Recorded</span></div>)}</div></div>
        </section>
      </main>
    </div>
  );
}
