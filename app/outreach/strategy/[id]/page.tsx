import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Strategy = Database["public"]["Tables"]["outreach_strategies"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];

export default async function OutreachStrategyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const { data: strategy } = await (supabase.from("outreach_strategies") as any).select("*").eq("id", id).maybeSingle();
  if (!strategy) notFound();
  const row = strategy as Strategy;

  const [{ data: lead }, { data: audit }] = await Promise.all([
    row.lead_id ? supabase.from("leads").select("*").eq("id", row.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    (supabase.from("audit_events") as any).select("id, action, actor_type, created_at, metadata").eq("entity_type", "outreach_strategy").eq("entity_id", row.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const linkedLead = lead as Lead | null;
  const events = (audit ?? []) as AuditEvent[];

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Outreach · Strategy</div><h1>{row.objective}</h1><p>{row.channel} · {row.service ?? "Service not set"} · {row.status}</p></div><Link className="ghost-button" href="/outreach">← Outreach</Link></header>
    <section className="lead-summary"><div className="summary-card"><span>Status</span><strong>{row.status}</strong></div><div className="summary-card"><span>Channel</span><strong>{row.channel}</strong></div><div className="summary-card"><span>Confidence</span><strong>{row.confidence == null ? "Manual" : `${row.confidence}%`}</strong></div><div className="summary-card"><span>Created</span><strong>{new Date(row.created_at).toLocaleDateString()}</strong></div></section>
    <div className="detail-grid">
      <section className="card"><div className="eyebrow">Strategy brief</div><h2>Message direction</h2><div className="detail-list"><div><dt>Persona</dt><dd>{row.persona || "Not defined"}</dd></div><div><dt>Angle</dt><dd>{row.angle || "Not defined"}</dd></div><div><dt>Value proposition</dt><dd>{row.value_proposition || "Not defined"}</dd></div></div></section>
      <section className="card"><div className="eyebrow">Linked lead</div><h2>Context</h2>{linkedLead ? <><p><Link className="text-link" href={`/leads/${linkedLead.id}`}>Open linked lead →</Link></p><div className="detail-list"><div><dt>Service</dt><dd>{linkedLead.service_interest || "Not set"}</dd></div><div><dt>Status</dt><dd>{linkedLead.status}</dd></div><div><dt>Fit score</dt><dd>{linkedLead.score ?? "Not scored"}</dd></div><div><dt>Problem</dt><dd>{linkedLead.problem_summary || "Not captured"}</dd></div></div></> : <p>No lead is linked to this strategy.</p>}</section>
    </div>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Governance</div><h2>Review history</h2><p>Human decisions and strategy changes are recorded here.</p></div></div>{events.length ? <div className="activity-list">{events.map(event => <div className="activity-item" key={event.id}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor_type} · {new Date(event.created_at).toLocaleString()}</span></div>)}</div> : <div className="empty-stage">No activity recorded yet.</div>}</section>
  </main>;
}
