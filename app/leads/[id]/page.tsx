import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateLead } from "./actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const stages = [
  { id: "new", label: "New" },
  { id: "researching", label: "Researching" },
  { id: "qualified", label: "Qualified" },
  { id: "outreach_ready", label: "Outreach ready" },
  { id: "contacted", label: "Contacted" },
  { id: "engaged", label: "Engaged" },
  { id: "opportunity", label: "Opportunity" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "nurture", label: "Nurture" },
];
const statusLabels = Object.fromEntries(stages.map((stage) => [stage.id, stage.label]));

function metadataObject(value: Database["public"]["Tables"]["audit_events"]["Row"]["metadata"]) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function LeadDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const [{ data: leadRow }, { data: organisationRow }, { data: opportunityRows }, { data: auditRows }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("organisations").select("*").eq("id", (await supabase.from("leads").select("organisation_id").eq("id", id).single()).data?.organisation_id ?? "").maybeSingle(),
    (supabase.from("opportunities") as any).select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    (supabase.from("audit_events") as any).select("*").eq("entity_type", "lead").eq("entity_id", id).order("created_at", { ascending: false }).limit(30),
  ]);

  if (!leadRow) notFound();
  const lead = leadRow as Lead;
  const organisation = organisationRow as Organisation | null;
  const opportunities = (opportunityRows ?? []) as Opportunity[];
  const auditEvents = (auditRows ?? []) as AuditEvent[];
  const websiteContact = auditEvents.find((event) => event.action === "website_lead_intake");
  const contactMeta = websiteContact ? metadataObject(websiteContact.metadata) : {};
  const error = typeof query.error === "string" ? query.error : null;
  const updated = query.updated === "1";

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">CRM · Lead detail</div>
          <h1>{organisation?.name ?? "Lead"}</h1>
          <p>{lead.service_interest ?? "Service interest not identified yet"} · {statusLabels[lead.status] ?? lead.status}</p>
        </div>
        <div className="header-actions"><Link className="ghost-button" href="/leads">← Back to leads</Link></div>
      </header>

      {updated && <div className="success-banner"><strong>Lead updated.</strong><span>The latest changes are now recorded in the live pipeline.</span></div>}
      {error && <div className="error-banner"><strong>Could not update lead.</strong><span>{error}</span></div>}

      <section className="lead-summary">
        <div className="summary-card"><span>Status</span><strong>{statusLabels[lead.status] ?? lead.status}</strong></div>
        <div className="summary-card"><span>Fit score</span><strong>{lead.score ?? "--"}</strong></div>
        <div className="summary-card"><span>Source</span><strong>{lead.source ?? "manual"}</strong></div>
        <div className="summary-card"><span>Opportunities</span><strong>{opportunities.length}</strong></div>
      </section>

      <div className="lead-detail-layout">
        <section className="card">
          <div className="section-heading"><div><div className="eyebrow">Lead record</div><h2>Details</h2><p>Keep the commercial context current so every downstream workflow has a reliable source of truth.</p></div></div>
          {role === "admin" || role === "operator" ? <form action={updateLead} className="research-form">
            <input type="hidden" name="lead_id" value={lead.id} />
            <div className="research-form-grid">
              <label>Status<select name="status" defaultValue={lead.status}>{stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.label}</option>)}</select></label>
              <label>Service interest<input name="service_interest" defaultValue={lead.service_interest ?? ""} placeholder="Web development, automation..." /></label>
              <label>Fit score<input name="score" type="number" min="0" max="100" defaultValue={lead.score ?? ""} /></label>
            </div>
            <label>Problem summary<textarea name="problem_summary" defaultValue={lead.problem_summary ?? ""} placeholder="What problem is the organisation trying to solve?" /></label>
            <button className="primary-button" type="submit">Save lead</button>
          </form> : <div className="detail-copy"><p>{lead.problem_summary ?? "No problem summary recorded."}</p></div>}
        </section>

        <aside className="card">
          <div className="eyebrow">Organisation</div>
          <h2>{organisation?.name ?? "Unknown organisation"}</h2>
          <div className="recommended"><strong>Industry</strong><span>{organisation?.industry ?? "Not set"}</span></div>
          <div className="recommended"><strong>Geography</strong><span>{organisation?.geography ?? "Not set"}</span></div>
          <div className="recommended"><strong>Website</strong><span>{organisation?.website_url ? <a className="text-link" href={organisation.website_url} target="_blank" rel="noreferrer">Open website →</a> : "Not set"}</span></div>
          <Link className="ghost-button" href={`/organisations/${organisation?.id ?? ""}`}>Open organisation</Link>
        </aside>
      </div>

      {websiteContact && <section className="card">
        <div className="section-heading"><div><div className="eyebrow">Website intake</div><h2>Original enquiry</h2><p>Details captured when this lead entered Operations from the public website.</p></div></div>
        <div className="lead-details-grid">
          <div className="recommended"><strong>Name</strong><span>{String(contactMeta.name ?? "Not captured")}</span></div>
          <div className="recommended"><strong>Email</strong><span>{String(contactMeta.email ?? "Not captured")}</span></div>
          <div className="recommended"><strong>Need</strong><span>{String(contactMeta.need ?? lead.service_interest ?? "Not captured")}</span></div>
          <div className="recommended"><strong>Timeline</strong><span>{String(contactMeta.timeline ?? "Not captured")}</span></div>
        </div>
      </section>}

      <section className="lead-detail-layout">
        <div className="card">
          <div className="section-heading"><div><div className="eyebrow">Opportunities</div><h2>Commercial next steps</h2><p>Opportunities linked to this lead will appear here.</p></div></div>
          {opportunities.length === 0 ? <div className="empty-stage"><strong>No opportunity yet</strong><span>Once this lead is qualified, create or link an opportunity here.</span><Link href="/opportunities">Open opportunities →</Link></div> : <div className="compact-list">{opportunities.map((opportunity) => <article className="compact-row" key={opportunity.id}><div><strong>{opportunity.name}</strong><span>{opportunity.stage} · {opportunity.currency} {opportunity.value ?? "0"} · {opportunity.probability ?? "--"}% probability</span></div><Link className="text-link" href={`/opportunities/${opportunity.id}`}>Open →</Link></article>)}</div>}
        </div>

        <div className="card">
          <div className="section-heading"><div><div className="eyebrow">Activity</div><h2>Audit trail</h2><p>Recent changes and intake events for this lead.</p></div></div>
          {auditEvents.length === 0 ? <div className="empty-stage">No activity recorded yet.</div> : <div className="compact-list">{auditEvents.map((event) => <article className="compact-row" key={event.id}><div><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor_type} · {new Date(event.created_at).toLocaleString()}</span></div></article>)}</div>}
        </div>
      </section>
    </main>
  );
}
