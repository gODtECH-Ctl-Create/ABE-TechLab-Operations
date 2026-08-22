import Link from "next/link";
import { redirect } from "next/navigation";
import { updateOrganisation } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];

const opportunityLabels: Record<string, string> = {
  discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost",
};

export default async function OrganisationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: organisation, error }, { data: leads }, { data: opportunities }, { data: activities }] = await Promise.all([
    supabase.from("organisations").select("id, name, industry, geography, website_url, created_at, updated_at").eq("id", id).single(),
    supabase.from("leads").select("id, status, service_interest, problem_summary, score, source, created_at, updated_at").eq("organisation_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, name, stage, value, currency, probability, expected_close_date, lead_id, created_at, updated_at").eq("organisation_id", id).order("created_at", { ascending: false }),
    supabase.from("audit_events").select("id, actor_type, action, metadata, created_at").eq("entity_type", "organisation").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (error || !organisation) redirect("/organisations?error=organisation_not_found");

  const record = organisation as Organisation;
  const organisationLeads = (leads ?? []) as Lead[];
  const organisationOpportunities = (opportunities ?? []) as Opportunity[];
  const organisationActivities = (activities ?? []) as AuditEvent[];
  const canEdit = ["admin", "operator"].includes(userRole);
  const openOpportunities = organisationOpportunities.filter((item) => !["won", "lost"].includes(item.stage));
  const pipelineValue = openOpportunities.reduce((total, item) => total + Number(item.value ?? 0), 0);
  const winningValue = organisationOpportunities.filter((item) => item.stage === "won").reduce((total, item) => total + Number(item.value ?? 0), 0);

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Organisation profile</div><h1>{record.name}</h1><p>{record.industry ?? "Industry not set"} · {record.geography ?? "Geography not set"}</p></div><Link className="ghost-button" href="/organisations">← Organisations</Link></header>
    {query.updated === "1" ? <div className="success-banner"><strong>Organisation updated.</strong><span>The account changes are saved.</span></div> : null}

    <section className="lead-summary">
      <div className="summary-card"><span>Linked leads</span><strong>{organisationLeads.length}</strong></div>
      <div className="summary-card"><span>Open opportunities</span><strong>{openOpportunities.length}</strong></div>
      <div className="summary-card"><span>Open pipeline</span><strong>{pipelineValue ? `₦${pipelineValue.toLocaleString("en-NG")}` : "₦0"}</strong></div>
      <div className="summary-card"><span>Won value</span><strong>{winningValue ? `₦${winningValue.toLocaleString("en-NG")}` : "₦0"}</strong></div>
    </section>

    <section className="organisation-detail-grid">
      <div className="card"><div className="section-heading"><div><div className="eyebrow">Account details</div><h2>Organisation information</h2><p>Core account information used throughout the Operations system.</p></div><span className="badge">{userRole}</span></div>
        {canEdit ? <form action={updateOrganisation} className="organisation-form"><input type="hidden" name="id" value={record.id} /><label>Organisation name<input name="name" defaultValue={record.name} required /></label><div className="organisation-form-grid"><label>Industry<input name="industry" defaultValue={record.industry ?? ""} placeholder="Technology" /></label><label>Geography<input name="geography" defaultValue={record.geography ?? ""} placeholder="Lagos, Nigeria" /></label></div><label>Website<input name="website_url" type="url" defaultValue={record.website_url ?? ""} placeholder="https://example.com" /></label><button className="primary-button" type="submit">Save changes →</button></form> : <div className="detail-fields"><div><span>Industry</span><strong>{record.industry ?? "Not set"}</strong></div><div><span>Geography</span><strong>{record.geography ?? "Not set"}</strong></div><div><span>Website</span><strong>{record.website_url ? <a className="text-link" href={record.website_url} target="_blank" rel="noreferrer">Open website →</a> : "Not set"}</strong></div></div>}
      </div>
      <div className="card"><div className="section-heading"><div><div className="eyebrow">Commercial relationship</div><h2>Account snapshot</h2><p>At-a-glance view of the commercial relationship with this organisation.</p></div></div>
        <div className="detail-fields"><div><span>Last lead</span><strong>{organisationLeads[0] ? new Date(organisationLeads[0].created_at).toLocaleDateString() : "No leads yet"}</strong></div><div><span>Current pipeline</span><strong>{openOpportunities.length ? `${openOpportunities.length} open opportunities` : "No open opportunities"}</strong></div><div><span>Current stage</span><strong>{openOpportunities[0] ? opportunityLabels[openOpportunities[0].stage] ?? openOpportunities[0].stage : "No active stage"}</strong></div></div>
        <div className="inline-empty"><strong>Next step</strong><span>{openOpportunities.length ? "Keep the opportunity and outreach records current." : organisationLeads.length ? "Review the latest lead and decide whether to create an opportunity." : "Capture the first lead to start the relationship timeline."}</span></div>
      </div>
    </section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Revenue relationship</div><h2>Linked leads</h2><p>Leads associated with this organisation, with their context and current status.</p></div><span className="badge">{organisationLeads.length}</span></div>
      <div className="compact-list">{organisationLeads.length === 0 ? <div className="empty-stage"><strong>No leads yet</strong><span>Create or qualify a lead for this organisation.</span><Link href="/leads">Open leads →</Link></div> : organisationLeads.map((lead) => <article className="compact-row" key={lead.id}><div><strong>{lead.service_interest ?? "Service not assigned"}</strong><span>{(lead.status ?? "unknown").replaceAll("_", " ")} · Score {lead.score ?? "not scored"} · {lead.source ?? "source not set"}</span><p className="row-body">{lead.problem_summary ?? "No problem summary recorded."}</p></div><Link className="text-link" href={`/leads/${lead.id}`}>Open lead →</Link></article>)}</div>
    </section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Commercial pipeline</div><h2>Linked opportunities</h2><p>Opportunities related to this organisation.</p></div><span className="badge">{organisationOpportunities.length}</span></div>
      <div className="compact-list">{organisationOpportunities.length === 0 ? <div className="empty-stage"><strong>No opportunities yet</strong><span>Create one after qualifying a lead.</span><Link href="/opportunities">Open opportunities →</Link></div> : organisationOpportunities.map((opportunity) => <article className="compact-row" key={opportunity.id}><div><strong>{opportunity.name}</strong><span>{opportunityLabels[opportunity.stage] ?? opportunity.stage} · {opportunity.value == null ? "Value not set" : `${opportunity.currency} ${Number(opportunity.value).toLocaleString("en-NG")}`} · {opportunity.probability ?? "--"}% probability</span><p className="row-body">{opportunity.expected_close_date ? `Expected close ${new Date(opportunity.expected_close_date).toLocaleDateString()}` : "Expected close date not set."}</p></div><Link className="text-link" href={`/opportunities/${opportunity.id}`}>Open opportunity →</Link></article>)}</div>
    </section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Audit trail</div><h2>Organisation activity</h2><p>Changes and operational events recorded against this account.</p></div></div>
      <div className="compact-list">{organisationActivities.length === 0 ? <div className="empty-stage"><span>No organisation activity recorded yet.</span></div> : organisationActivities.map((activity) => <div className="compact-row" key={activity.id}><div><strong>{activity.action.replaceAll("_", " ")}</strong><span>{activity.actor_type} · {new Date(activity.created_at).toLocaleString()}</span></div><span className="status-chip">Recorded</span></div>)}</div>
    </section>
  </main>;
}
