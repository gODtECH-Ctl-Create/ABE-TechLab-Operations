import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  const [leadsResult, opportunitiesResult, auditResult] = await Promise.all([
    (supabase.from("leads") as any).select("id,status,score,source,created_at,updated_at,owner_id,next_action_due_at").is("deleted_at", null),
    (supabase.from("opportunities") as any).select("id,name,stage,value,probability,expected_close_date,updated_at,owner_id,next_action_due_at").is("deleted_at", null),
    (supabase.from("audit_events") as any).select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);

  const leads = leadsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const activities = auditResult.data ?? [];
  const activeOpps = opportunities.filter((o: any) => !["won", "lost"].includes(o.stage));
  const pipelineValue = activeOpps.reduce((sum: number, o: any) => sum + Number(o.value ?? 0), 0);
  const weightedPipeline = activeOpps.reduce((sum: number, o: any) => sum + Number(o.value ?? 0) * Number(o.probability ?? 0) / 100, 0);
  const won = opportunities.filter((o: any) => o.stage === "won");
  const lost = opportunities.filter((o: any) => o.stage === "lost");
  const conversion = opportunities.length ? Math.round((won.length / opportunities.length) * 100) : 0;
  const overdue = [...leads, ...opportunities].filter((r: any) => r.next_action_due_at && new Date(r.next_action_due_at) < new Date()).length;
  const stageCounts = ["new","researching","qualified","outreach_ready","contacted","engaged","opportunity","won","lost","nurture"].map((stage) => ({ stage, count: leads.filter((l: any) => l.status === stage).length }));
  const sourceMap = new Map<string, number>();
  for (const lead of leads) sourceMap.set(lead.source || "unknown", (sourceMap.get(lead.source || "unknown") ?? 0) + 1);

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Management · Reporting</div><h1>Reporting & Forecasting</h1><p>Understand pipeline value, weighted revenue, conversion, workload and operational health.</p></div>
      <Link className="ghost-button" href="/">← Dashboard</Link>
    </header>
    <section className="metrics">
      <div className="metric-card featured"><div className="metric-label">Open pipeline value</div><div className="metric-value">₦{pipelineValue.toLocaleString()}</div><div className="metric-foot"><span>{activeOpps.length} active opportunities</span></div></div>
      <div className="metric-card"><div className="metric-label">Weighted pipeline</div><div className="metric-value">₦{Math.round(weightedPipeline).toLocaleString()}</div><div className="metric-foot"><span>Probability-adjusted</span></div></div>
      <div className="metric-card"><div className="metric-label">Opportunity conversion</div><div className="metric-value">{conversion}%</div><div className="metric-foot"><span>{won.length} won · {lost.length} lost</span></div></div>
      <div className="metric-card"><div className="metric-label">Overdue next actions</div><div className="metric-value">{overdue}</div><div className="metric-foot"><Link href="/attention">Review attention →</Link></div></div>
    </section>
    <section className="detail-grid">
      <section className="card"><div className="eyebrow">Lead funnel</div><h2>Lifecycle distribution</h2><div className="detail-list">{stageCounts.map((item) => <div key={item.stage}><dt>{item.stage.replaceAll("_", " ")}</dt><dd>{item.count}</dd></div>)}</div></section>
      <section className="card"><div className="eyebrow">Lead sources</div><h2>Where leads come from</h2><div className="detail-list">{Array.from(sourceMap.entries()).map(([source,count]) => <div key={source}><dt>{source}</dt><dd>{count}</dd></div>)}</div></section>
      <section className="card"><div className="eyebrow">Opportunity view</div><h2>Active pipeline</h2><div className="detail-list">{activeOpps.slice(0,8).map((o:any) => <div key={o.id}><dt>{o.name}</dt><dd>₦{Number(o.value ?? 0).toLocaleString()} · {o.probability ?? 0}%</dd></div>)}{activeOpps.length === 0 && <div><dt>No active opportunities</dt><dd>0</dd></div>}</div></section>
      <section className="card"><div className="eyebrow">Activity health</div><h2>Operational activity</h2><div className="detail-list"><div><dt>Recent audit events</dt><dd>{activities.length}</dd></div><div><dt>Active leads</dt><dd>{leads.filter((l:any)=>!["won","lost"].includes(l.status)).length}</dd></div><div><dt>Assigned leads</dt><dd>{leads.filter((l:any)=>Boolean(l.owner_id)).length}</dd></div><div><dt>Scheduled lead actions</dt><dd>{leads.filter((l:any)=>Boolean(l.next_action_due_at)).length}</dd></div></div></section>
    </section>
    <section className="card" style={{marginTop:14}}><div className="section-heading"><div><div className="eyebrow">Forecasting</div><h2>How to read these numbers</h2><p>Reporting is decision support, not a promise of revenue. Weighted pipeline combines opportunity value with the current probability recorded on each opportunity.</p></div></div><div className="empty-stage"><strong>Forecasting maturity comes next</strong><span>Once the team has enough historical data, we can add stage velocity, win-rate trends, expected close accuracy, service-level performance and source-level conversion.</span></div></section>
  </main>;
}
