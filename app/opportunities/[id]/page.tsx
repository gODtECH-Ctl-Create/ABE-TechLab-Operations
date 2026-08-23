import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { updateOpportunity } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const stages = ["discovery", "qualification", "proposal", "negotiation", "won", "lost"] as const;
const labels: Record<(typeof stages)[number], string> = { discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function OpportunityDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!opportunity) notFound();
  const row = opportunity as Opportunity;

  const [organisationResult, leadResult, auditResult, membersResult] = await Promise.all([
    supabase.from("organisations").select("id, name, website_url, industry, geography").eq("id", row.organisation_id).maybeSingle(),
    row.lead_id ? supabase.from("leads").select("id, service_interest, status, problem_summary, score, source").eq("id", row.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("audit_events").select("id, action, actor_type, created_at, metadata").eq("entity_type", "opportunity").eq("entity_id", row.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("user_profiles").select("id, display_name").order("display_name", { ascending: true }),
  ]);

  const org = organisationResult.data as Pick<Organisation, "id" | "name" | "website_url" | "industry" | "geography"> | null;
  const linkedLead = leadResult.data as Pick<Lead, "id" | "service_interest" | "status" | "problem_summary" | "score" | "source"> | null;
  const audit = (auditResult.data ?? []) as Pick<AuditEvent, "id" | "action" | "actor_type" | "created_at" | "metadata">[];
  const members = (membersResult.data ?? []) as { id: string; display_name: string | null }[];
  const error = typeof query.error === "string" ? query.error : null;
  const updated = query.updated === "1";
  const overdue = !!row.next_action_due_at && new Date(row.next_action_due_at).getTime() < Date.now() && !["won", "lost"].includes(row.stage);

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">CRM · Opportunity</div><h1>{row.name}</h1><p>{row.description || "No opportunity description has been added yet."}</p></div><Link className="ghost-button" href="/opportunities">← Opportunities</Link></header>
    {updated && <div className="success-banner"><strong>Opportunity updated.</strong><span>Ownership, next action and pipeline state have been recorded.</span></div>}
    {error && <div className="error-banner"><strong>Could not update opportunity.</strong><span>{error === "next_action_owner_required" ? "Active opportunities require an owner, next action, and due date." : error}</span></div>}
    <section className="lead-summary"><div className="summary-card"><span>Stage</span><strong>{labels[row.stage as (typeof stages)[number]] ?? row.stage}</strong></div><div className="summary-card"><span>Value</span><strong>{row.value === null ? "Not set" : money.format(Number(row.value))}</strong></div><div className="summary-card"><span>Probability</span><strong>{row.probability === null ? "--" : `${row.probability}%`}</strong></div><div className="summary-card"><span>Next action due</span><strong className={overdue ? "danger-text" : undefined}>{row.next_action_due_at ? new Date(row.next_action_due_at).toLocaleDateString() : "Not scheduled"}</strong></div></section>
    {(role === "admin" || role === "operator") && <section className="card"><div className="section-heading"><div><div className="eyebrow">Pipeline control</div><h2>Opportunity plan</h2><p>Every active opportunity needs a clear owner, next action, and due date.</p></div>{overdue && <span className="status-chip danger">Overdue</span>}</div><form action={updateOpportunity} className="research-form"><input type="hidden" name="opportunity_id" value={row.id} /><div className="research-form-grid"><label>Stage<select name="stage" defaultValue={row.stage}>{stages.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}</select></label><label>Owner<select name="owner_id" defaultValue={row.owner_id ?? user.id}><option value={user.id}>Current user</option>{members.filter((member) => member.id !== user.id).map((member) => <option key={member.id} value={member.id}>{member.display_name || "Team member"}</option>)}</select></label><label>Probability (%)<input name="probability" type="number" min="0" max="100" defaultValue={row.probability ?? ""} /></label><label>Value (NGN)<input name="value" type="number" min="0" step="1000" defaultValue={row.value ?? ""} /></label></div><div className="research-form-grid"><label>Next action<input name="next_action" defaultValue={row.next_action ?? ""} placeholder="Send proposal, schedule demo..." required={!['won','lost'].includes(row.stage)} /></label><label>Next action due<input name="next_action_due_at" type="datetime-local" defaultValue={toLocalInputValue(row.next_action_due_at)} required={!['won','lost'].includes(row.stage)} /></label></div><button className="primary-button" type="submit">Save opportunity plan</button></form></section>}
    <div className="detail-grid"><section className="card"><div className="eyebrow">Account</div><h2>Organisation</h2>{org ? <><p><Link className="text-link" href={`/organisations/${org.id}`}>{org.name}</Link></p><dl className="detail-list"><div><dt>Industry</dt><dd>{org.industry || "Not set"}</dd></div><div><dt>Geography</dt><dd>{org.geography || "Not set"}</dd></div><div><dt>Website</dt><dd>{org.website_url || "Not set"}</dd></div></dl></> : <p>Organisation not found.</p>}</section><section className="card"><div className="eyebrow">Origin</div><h2>Related lead</h2>{linkedLead ? <><p><Link className="text-link" href={`/leads/${linkedLead.id}`}>View linked lead</Link></p><dl className="detail-list"><div><dt>Service</dt><dd>{linkedLead.service_interest || "Not set"}</dd></div><div><dt>Lead status</dt><dd>{linkedLead.status}</dd></div><div><dt>Fit score</dt><dd>{linkedLead.score ?? "Not scored"}</dd></div><div><dt>Source</dt><dd>{linkedLead.source || "Not set"}</dd></div><div><dt>Problem</dt><dd>{linkedLead.problem_summary || "Not set"}</dd></div></dl></> : <p>No lead is linked to this opportunity.</p>}</section></div>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Accountability</div><h2>Next action</h2><p>Every active opportunity should have a clear owner and a concrete next step.</p></div></div><div className="lead-details-grid"><div className="recommended"><strong>Owner</strong><span>{row.owner_id ?? "Unassigned"}</span></div><div className="recommended"><strong>Action</strong><span>{row.next_action ?? "No next action recorded"}</span></div><div className="recommended"><strong>Due</strong><span className={overdue ? "danger-text" : undefined}>{row.next_action_due_at ? new Date(row.next_action_due_at).toLocaleString() : "No due date"}</span></div></div></section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">History</div><h2>Opportunity activity</h2><p>Changes recorded against this opportunity.</p></div></div>{audit.length > 0 ? <div className="activity-list">{audit.map((event) => <div className="activity-item" key={event.id}><strong>{String(event.action).replaceAll("_", " ")}</strong><span>{new Date(event.created_at).toLocaleString()}</span></div>)}</div> : <div className="empty-stage">No activity recorded yet.</div>}</section>
  </main>;
}
