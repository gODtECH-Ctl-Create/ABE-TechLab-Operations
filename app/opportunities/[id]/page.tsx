import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateOpportunityStage } from "../actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Props = { params: Promise<{ id: string }> };

const stages = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;
const labels: Record<(typeof stages)[number], string> = { discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function OpportunityDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!opportunity) notFound();
  const row = opportunity as Opportunity;

  const [{ data: organisation }, { data: lead }, { data: audit }] = await Promise.all([
    supabase.from("organisations").select("id, name, website_url, industry, geography").eq("id", row.organisation_id).maybeSingle(),
    row.lead_id ? supabase.from("leads").select("id, service_interest, status, problem_summary, score, source").eq("id", row.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("audit_events").select("id, action, actor_type, created_at, metadata").eq("entity_type", "opportunity").eq("entity_id", row.id).order("created_at", { ascending: false }).limit(30),
  ]);

  const org = organisation as Pick<Organisation, "id" | "name" | "website_url" | "industry" | "geography"> | null;
  const linkedLead = lead as Pick<Lead, "id" | "service_interest" | "status" | "problem_summary" | "score" | "source"> | null;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">CRM · Opportunity</div><h1>{row.name}</h1><p>{row.description || "No opportunity description has been added yet."}</p></div><Link className="ghost-button" href="/opportunities">← Opportunities</Link></header>
    <section className="lead-summary"><div className="summary-card"><span>Stage</span><strong>{labels[row.stage as (typeof stages)[number]] ?? row.stage}</strong></div><div className="summary-card"><span>Value</span><strong>{row.value === null ? "Not set" : money.format(Number(row.value))}</strong></div><div className="summary-card"><span>Probability</span><strong>{row.probability === null ? "--" : `${row.probability}%`}</strong></div><div className="summary-card"><span>Expected close</span><strong>{row.expected_close_date ? new Date(row.expected_close_date).toLocaleDateString() : "Not set"}</strong></div></section>
    {(role === "admin" || role === "operator") && <section className="card"><div className="section-heading"><div><div className="eyebrow">Pipeline control</div><h2>Update stage</h2><p>Keep the commercial pipeline aligned with the latest conversation.</p></div></div><form action={updateOpportunityStage} className="status-form"><input type="hidden" name="opportunity_id" value={row.id} /><label>Stage<select name="stage" defaultValue={row.stage}>{stages.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}</select></label><button className="primary-button" type="submit">Save stage</button></form></section>}
    <div className="detail-grid">
      <section className="card"><div className="eyebrow">Account</div><h2>Organisation</h2>{org ? <><p><Link className="text-link" href={`/organisations/${org.id}`}>{org.name}</Link></p><dl className="detail-list"><div><dt>Industry</dt><dd>{org.industry || "Not set"}</dd></div><div><dt>Geography</dt><dd>{org.geography || "Not set"}</dd></div><div><dt>Website</dt><dd>{org.website_url || "Not set"}</dd></div></dl></> : <p>Organisation not found.</p>}</section>
      <section className="card"><div className="eyebrow">Origin</div><h2>Related lead</h2>{linkedLead ? <><p><Link className="text-link" href={`/leads/${linkedLead.id}`}>View linked lead</Link></p><dl className="detail-list"><div><dt>Service</dt><dd>{linkedLead.service_interest || "Not set"}</dd></div><div><dt>Lead status</dt><dd>{linkedLead.status}</dd></div><div><dt>Fit score</dt><dd>{linkedLead.score ?? "Not scored"}</dd></div><div><dt>Source</dt><dd>{linkedLead.source || "Not set"}</dd></div><div><dt>Problem</dt><dd>{linkedLead.problem_summary || "Not set"}</dd></div></dl></> : <p>No lead is linked to this opportunity.</p>}</section>
    </div>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">History</div><h2>Opportunity activity</h2><p>Changes recorded against this opportunity.</p></div></div>{audit && audit.length > 0 ? <div className="activity-list">{audit.map((event) => <div className="activity-item" key={event.id}><strong>{String(event.action).replaceAll("_", " ")}</strong><span>{new Date(event.created_at).toLocaleString()}</span></div>)}</div> : <div className="empty-stage">No activity recorded yet.</div>}</section>
  </main>;
}
