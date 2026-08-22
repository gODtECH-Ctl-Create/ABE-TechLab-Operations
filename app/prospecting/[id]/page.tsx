import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import type { Database, Json } from "../../../lib/data/supabase/database.types";
import { convertProspectToLead } from "../actions";

type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Qualification = Database["public"]["Tables"]["qualifications"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];
type EvidenceObject = { [key: string]: Json | undefined };

const evidenceItems = (prospect: Prospect): EvidenceObject[] => {
  if (!Array.isArray(prospect.evidence)) return [];
  return prospect.evidence.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) as EvidenceObject[];
};

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const [{ data: prospect }, { data: organisation }, { data: qualification }, { data: lead }, { data: audit }] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase.from("organisations").select("id, name, industry, geography, website_url").eq("id", id).maybeSingle(),
    supabase.from("qualifications").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("leads").select("id, status, service_interest, score, source").eq("prospect_id", id).maybeSingle(),
    supabase.from("audit_events").select("id, action, actor_type, created_at, metadata").eq("entity_type", "prospect").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (!prospect) notFound();
  const row = prospect as Prospect;
  const org = organisation as Pick<Organisation, "id" | "name" | "industry" | "geography" | "website_url"> | null;
  const qual = qualification as Qualification | null;
  const linkedLead = lead as { id: string; status: string; service_interest: string | null; score: number | null; source: string | null } | null;
  const events = (audit ?? []) as AuditEvent[];
  const canConvert = ["admin", "operator"].includes(String(role)) && !linkedLead;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Customer intelligence · Prospect</div><h1>{org?.name ?? "Prospect"}</h1><p>{org?.industry ?? "Industry not set"} · {org?.geography ?? "Geography not set"}</p></div><Link className="ghost-button" href="/prospecting">← Prospecting</Link></header>

    <section className="lead-summary"><div className="summary-card"><span>Research score</span><strong>{row.score ?? "—"}/100</strong></div><div className="summary-card"><span>Confidence</span><strong>{row.confidence ?? "—"}%</strong></div><div className="summary-card"><span>Status</span><strong>{row.status.replaceAll("_", " ")}</strong></div><div className="summary-card"><span>Lead</span><strong>{linkedLead ? "Created" : "Not created"}</strong></div></section>

    <div className="detail-grid">
      <section className="card"><div className="section-heading"><div><div className="eyebrow">Prospect profile</div><h2>Why this prospect matters</h2><p>Research-backed need and recommended service.</p></div></div><div className="detail-fields"><div><span>Likely need</span><strong>{row.likely_need ?? "Not established"}</strong></div><div><span>Recommended service</span><strong>{row.recommended_service ?? "Not established"}</strong></div><div><span>Organisation</span><strong>{org ? <Link className="text-link" href={`/organisations/${org.id}`}>{org.name}</Link> : "Not found"}</strong></div><div><span>Website</span><strong>{org?.website_url ? <a className="text-link" href={org.website_url} target="_blank" rel="noreferrer">Open website →</a> : "Not set"}</strong></div></div></section>

      <section className="card"><div className="section-heading"><div><div className="eyebrow">Qualification</div><h2>Human decision context</h2><p>Research provides signals. The team decides whether this becomes an active lead.</p></div></div>{qual ? <div className="detail-fields"><div><span>Classification</span><strong>{qual.classification}</strong></div><div><span>Qualification score</span><strong>{qual.score}/100</strong></div><div><span>Confidence</span><strong>{qual.confidence}%</strong></div><div><span>Recommended next action</span><strong>{qual.next_action ?? "Not set"}</strong></div></div> : <div className="empty-stage"><strong>No qualification record yet</strong><span>The research worker can populate this later. You can still review the evidence manually.</span></div>}
        {canConvert ? <form action={convertProspectToLead} className="top-space"><input type="hidden" name="prospect_id" value={row.id} /><button className="primary-button" type="submit">Convert to lead →</button></form> : null}
        {linkedLead ? <div className="inline-empty top-space"><strong>Lead created</strong><span>This prospect is already represented in the lead pipeline.</span><Link href={`/leads/${linkedLead.id}`}>Open lead →</Link></div> : null}
      </section>
    </div>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Evidence review</div><h2>Research evidence</h2><p>Separate verified signals from inference before taking external action.</p></div></div>{evidenceItems(row).length === 0 ? <div className="empty-stage"><span>No evidence items recorded yet.</span></div> : <div className="approval-stack">{evidenceItems(row).map((item, index) => <article className="approval-card" key={`${row.id}-${index}`}><div className="approval-card-head"><div><span className="approval-type">{String(item.sourceType ?? "Source")}</span><h3>{String(item.claim ?? "Evidence item")}</h3></div><span className="status-chip">{String(item.source ?? "Research record")}</span></div></article>)}</div>}</section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Audit trail</div><h2>Prospect activity</h2><p>Research and qualification changes remain traceable.</p></div></div>{events.length === 0 ? <div className="empty-stage"><span>No prospect activity recorded yet.</span></div> : <div className="activity-list">{events.map((event) => <div className="activity-item" key={event.id}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor_type} · {new Date(event.created_at).toLocaleString()}</span></div>)}</div>}</section>
  </main>;
}
