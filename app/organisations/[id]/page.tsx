import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateOrganisation } from "../actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];

export default async function OrganisationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: organisation, error }, { data: leads }, { data: activities }] = await Promise.all([
    supabase.from("organisations").select("id, name, industry, geography, website_url, created_at, updated_at").eq("id", id).single(),
    supabase.from("leads").select("id, status, service_interest, problem_summary, score, created_at, updated_at").eq("organisation_id", id).order("created_at", { ascending: false }),
    supabase.from("audit_events").select("id, actor_type, action, metadata, created_at").eq("entity_type", "organisation").eq("entity_id", id).order("created_at", { ascending: false }).limit(12),
  ]);
  if (error || !organisation) redirect("/organisations?error=organisation_not_found");
  const record: Organisation = organisation;
  const organisationLeads: Lead[] = (leads ?? []) as Lead[];
  const organisationActivities: AuditEvent[] = (activities ?? []) as AuditEvent[];
  const canEdit = ["admin", "operator"].includes(userRole);

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Organisation profile</div><h1>{record.name}</h1><p>{record.industry ?? "Industry not set"} · {record.geography ?? "Geography not set"}</p></div><a className="ghost-button" href="/organisations">← Organisations</a></header>
    {query.updated === "1" ? <div className="success-banner"><strong>Organisation updated.</strong><span>The account changes are saved.</span></div> : null}
    <section className="organisation-detail-grid">
      <div className="card"><div className="section-heading"><div><div className="eyebrow">Account details</div><h2>Organisation information</h2><p>Core account information used throughout the Operations system.</p></div><span className="badge">{userRole}</span></div>
        {canEdit ? <form action={updateOrganisation} className="organisation-form"><input type="hidden" name="id" value={record.id} /><label>Organisation name<input name="name" defaultValue={record.name} required /></label><div className="organisation-form-grid"><label>Industry<input name="industry" defaultValue={record.industry ?? ""} /></label><label>Geography<input name="geography" defaultValue={record.geography ?? ""} /></label></div><label>Website<input name="website_url" type="url" defaultValue={record.website_url ?? ""} /></label><button className="primary-button" type="submit">Save changes →</button></form> : <div className="detail-fields"><div><span>Industry</span><strong>{record.industry ?? "Not set"}</strong></div><div><span>Geography</span><strong>{record.geography ?? "Not set"}</strong></div><div><span>Website</span><strong>{record.website_url ?? "Not set"}</strong></div></div>}
      </div>
      <div className="card"><div className="section-heading"><div><div className="eyebrow">Revenue relationship</div><h2>Linked leads</h2><p>Leads associated with this organisation.</p></div><span className="badge">{organisationLeads.length}</span></div><div className="compact-list">{organisationLeads.length === 0 ? <div className="empty-stage"><strong>No leads yet</strong><span>Create or qualify a lead for this organisation.</span><a href="/leads">Open leads →</a></div> : organisationLeads.map(lead => <div className="compact-row" key={lead.id}><div><strong>{lead.service_interest ?? "Service not assigned"}</strong><span>{(lead.status ?? "unknown").replaceAll("_", " ")} · {lead.problem_summary ?? "No problem summary"}</span></div><span className="status-chip">{lead.score ?? "—"} fit</span></div>)}</div></div>
    </section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Audit trail</div><h2>Organisation activity</h2><p>Changes to this account remain visible for operational accountability.</p></div></div><div className="compact-list">{organisationActivities.length === 0 ? <div className="empty-stage"><span>No organisation activity recorded yet.</span></div> : organisationActivities.map(activity => <div className="compact-row" key={activity.id}><div><strong>{activity.action}</strong><span>{activity.actor_type} · {new Date(activity.created_at).toLocaleString()}</span></div><span className="status-chip">Recorded</span></div>)}</div></section>
  </main>;
}
