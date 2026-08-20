import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLead, updateLeadStatus } from "./actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const stages = [
  { id: "new", label: "New" }, { id: "researching", label: "Researching" }, { id: "qualified", label: "Qualified" },
  { id: "outreach_ready", label: "Outreach ready" }, { id: "contacted", label: "Contacted" }, { id: "engaged", label: "Engaged" },
  { id: "opportunity", label: "Opportunity" }, { id: "won", label: "Won" },
];
const statusLabels: Record<string, string> = Object.fromEntries(stages.map((stage) => [stage.id, stage.label]));

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const [{ data: leadRows, error: leadsError }, { data: organisationRows, error: organisationsError }] = await Promise.all([
    supabase.from("leads").select("id, organisation_id, prospect_id, status, service_interest, problem_summary, score, source, created_at, updated_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("organisations").select("id, name, industry, geography, website_url, created_at, updated_at").order("name", { ascending: true }).limit(200),
  ]);
  if (leadsError) throw new Error(leadsError.message);
  if (organisationsError) throw new Error(organisationsError.message);

  const leads = (leadRows ?? []) as Lead[];
  const organisations = (organisationRows ?? []) as Organisation[];
  const organisationById = new Map(organisations.map((organisation) => [organisation.id, organisation]));
  const activeLeads = leads.filter((lead) => !["won", "lost", "nurture"].includes(lead.status));
  const highPriority = leads.filter((lead) => (lead.score ?? 0) >= 85);
  const priorityFilter = params.priority === "high";
  const visibleLeads = priorityFilter ? highPriority : leads;
  const created = params.created === "1";
  const updated = params.updated === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="page-shell">
      <header className="page-header">
        <div><div className="eyebrow">CRM · Lead management</div><h1>{priorityFilter ? "High-priority leads" : "Leads"}</h1><p>{priorityFilter ? "Leads with a fit score of 85 or above, prioritized for immediate review." : "Manage the real lead pipeline. Every change is stored in Supabase and recorded in the audit trail."}</p></div>
        <div className="header-actions"><a className="ghost-button" href="/">← Dashboard</a>{priorityFilter && <a className="text-link" href="/leads">View all leads →</a>}</div>
      </header>

      {created && <div className="success-banner"><strong>Lead created.</strong><span>The lead is now in the live pipeline.</span></div>}
      {updated && <div className="success-banner"><strong>Lead updated.</strong><span>The status change has been recorded.</span></div>}
      {error && <div className="error-banner"><strong>Could not complete the action.</strong><span>{error === "organisation_required" ? "Select an organisation before creating a lead." : error}</span></div>}

      <section className="lead-summary"><div className="summary-card"><span>Active leads</span><strong>{activeLeads.length}</strong></div><a className="summary-card summary-card-link" href="/leads?priority=high"><span>High priority</span><strong>{highPriority.length}</strong></a><div className="summary-card"><span>Won</span><strong>{leads.filter((lead) => lead.status === "won").length}</strong></div><div className="summary-card"><span>Organisations</span><strong>{organisations.length}</strong></div></section>

      {!priorityFilter && (role === "admin" || role === "operator") && <section className="card">
        <div className="section-heading"><div><div className="eyebrow">Manual intake</div><h2>Create a lead</h2><p>Add a prospect manually while artificial intelligence research is paused.</p></div></div>
        {organisations.length === 0 ? <div className="empty-stage"><strong>No organisations available</strong><span>Create an organisation first, then return here.</span></div> : <form action={createLead} className="research-form"><div className="research-form-grid"><label>Organisation<select name="organisation_id" required defaultValue=""><option value="" disabled>Select organisation</option>{organisations.map((organisation) => <option value={organisation.id} key={organisation.id}>{organisation.name}</option>)}</select></label><label>Service interest<input name="service_interest" placeholder="Web development, AI automation..." /></label><label>Fit score<input name="score" type="number" min="0" max="100" placeholder="0–100" /></label></div><label>Problem summary<textarea name="problem_summary" placeholder="What problem could ABE TechLab help solve?" /></label><button className="primary-button" type="submit">Create lead →</button></form>}
      </section>}

      <section className="card pipeline-card">
        <div className="section-heading"><div><div className="eyebrow">Live data</div><h2>{priorityFilter ? "Priority lead pipeline" : "Lead pipeline"}</h2><p>{priorityFilter ? "Only high-priority leads are shown in this focused view." : "Move leads through the sales process without relying on artificial intelligence."}</p></div><span className="badge">{visibleLeads.length} records</span></div>
        <div className="pipeline">{stages.map((stage) => { const stageLeads = visibleLeads.filter((lead) => lead.status === stage.id); return <div className="pipeline-column" key={stage.id}><div className="pipeline-title"><span>{stage.label}</span><b>{stageLeads.length}</b></div>{stageLeads.map((lead) => { const organisation = organisationById.get(lead.organisation_id); return <article className="lead-card" key={lead.id}><div className="lead-score">{lead.score ?? "--"}</div><h3>{organisation?.name ?? "Unknown organisation"}</h3><p>{lead.service_interest ?? "Service not yet identified"}</p>{lead.problem_summary && <small>{lead.problem_summary}</small>}<small>{lead.source ?? "manual"} · {new Date(lead.created_at).toLocaleDateString()}</small>{(role === "admin" || role === "operator") && <form action={updateLeadStatus} className="status-form"><input type="hidden" name="lead_id" value={lead.id} /><label className="sr-only" htmlFor={`status-${lead.id}`}>Lead status</label><select id={`status-${lead.id}`} name="status" defaultValue={lead.status}>{stages.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}<option value="lost">Lost</option><option value="nurture">Nurture</option></select><button type="submit" className="text-link">Update</button></form>}</article>;})}{stageLeads.length === 0 && <div className="empty-stage">No leads</div>}</div>; })}</div>
      </section>

      <section className="lead-details-grid">{highPriority.map((lead) => { const organisation = organisationById.get(lead.organisation_id); return <article className="card lead-detail" key={lead.id}><div className="eyebrow">Priority lead</div><div className="detail-top"><h2>{organisation?.name ?? "Unknown organisation"}</h2><span className="score-pill">{lead.score}/100</span></div><p>{lead.problem_summary ?? "No problem summary has been recorded yet."}</p><div className="recommended"><strong>Service interest</strong><span>{lead.service_interest ?? "Not assigned"}</span></div><div className="recommended"><strong>Current stage</strong><span>{statusLabels[lead.status] ?? lead.status}</span></div></article>; })}</section>
    </main>
  );
}
