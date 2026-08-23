import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLeadHealth, getOpportunityHealth, recordHealthLabels, type RecordHealth } from "@/lib/workflow/record-health";
import type { Database } from "@/lib/data/supabase/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];

function badgeClass(health: RecordHealth) { return health === "overdue" || health === "needs_action" ? "attention-badge danger" : health === "stale" || health === "unassigned" ? "attention-badge warning" : "attention-badge"; }

export default async function AttentionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const [{ data: leadRows }, { data: opportunityRows }, { data: organisationRows }] = await Promise.all([
    (supabase.from("leads") as any).select("id, organisation_id, status, next_action, next_action_due_at, owner_id, updated_at").not("status", "in", "(won,lost,nurture,suppressed)").order("updated_at", { ascending: true }).limit(200),
    (supabase.from("opportunities") as any).select("id, organisation_id, name, stage, owner_id, next_action, next_action_due_at, expected_close_date, updated_at").not("stage", "in", "(won,lost)").order("updated_at", { ascending: true }).limit(200),
    supabase.from("organisations").select("id,name").limit(200),
  ]);

  const orgs = (organisationRows ?? []) as Pick<Organisation,"id"|"name">[];
  const orgById = new Map(orgs.map((org) => [org.id, org]));
  const leads = (leadRows ?? []) as Lead[];
  const opportunities = (opportunityRows ?? []) as Opportunity[];
  const leadItems = leads.map((lead) => ({ type: "Lead" as const, id: lead.id, name: orgById.get(lead.organisation_id)?.name ?? "Unknown organisation", health: getLeadHealth(lead), action: lead.next_action, due: lead.next_action_due_at }));
  const opportunityItems = opportunities.map((opportunity) => ({ type: "Opportunity" as const, id: opportunity.id, name: opportunity.name, health: getOpportunityHealth(opportunity), action: opportunity.next_action, due: opportunity.next_action_due_at ?? opportunity.expected_close_date }));
  const items = [...leadItems, ...opportunityItems].filter((item) => item.health !== "healthy").sort((a,b) => (a.due ? new Date(a.due).getTime() : 0) - (b.due ? new Date(b.due).getTime() : 0));
  const counts = items.reduce<Record<RecordHealth,number>>((acc,item) => { acc[item.health] = (acc[item.health] ?? 0) + 1; return acc; }, { healthy:0, overdue:0, stale:0, unassigned:0, needs_action:0 });

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Operations · Needs attention</div><h1>Needs attention</h1><p>Stale, overdue, unassigned, and incomplete active work. Nothing is changed automatically.</p></div><Link className="ghost-button" href="/">← Dashboard</Link></header>
    <section className="lead-summary"><div className="summary-card"><span>Overdue</span><strong>{counts.overdue}</strong></div><div className="summary-card"><span>Needs action</span><strong>{counts.needs_action}</strong></div><div className="summary-card"><span>Stale</span><strong>{counts.stale}</strong></div><div className="summary-card"><span>Unassigned</span><strong>{counts.unassigned}</strong></div></section>
    <section className="card attention-list-card"><div className="section-heading"><div><div className="eyebrow">Review queue</div><h2>Records requiring attention</h2><p>Open the record and decide whether to update, follow up, nurture, reassign, or close it.</p></div><span className="badge">{items.length} items</span></div>
      {items.length === 0 ? <div className="empty-stage"><strong>Everything is on track</strong><span>No active leads or opportunities currently meet the stale/overdue attention rules.</span></div> : <div className="compact-list">{items.map((item) => <article className="attention-row" key={`${item.type}-${item.id}`}><div><div className="attention-row-title"><strong>{item.name}</strong><span className={badgeClass(item.health)}>{recordHealthLabels[item.health]}</span></div><span>{item.type} · {item.action ?? "No next action recorded"}{item.due ? ` · Due ${new Date(item.due).toLocaleString()}` : ""}</span></div><Link className="text-link" href={item.type === "Lead" ? `/leads/${item.id}` : `/opportunities/${item.id}`}>Open →</Link></article>)}</div>}
    </section>
    <style>{`.attention-list-card{margin-top:14px}.attention-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-top:1px solid #eceef0}.attention-row:first-child{border-top:0}.attention-row>div{min-width:0}.attention-row-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.attention-row strong{font-size:12px}.attention-row span:not(.attention-badge){display:block;margin-top:4px;color:#787f88;font-size:10px;line-height:1.45}.attention-badge{display:inline-flex!important;align-items:center;padding:4px 7px!important;border-radius:999px;background:#eef0f2;color:#5f656d!important;font-size:9px!important;font-weight:800}.attention-badge.warning{background:#f7efdb;color:#8a6818!important}.attention-badge.danger{background:#f6e5e5;color:#a13d3d!important}@media(max-width:560px){.attention-row{align-items:flex-start;flex-direction:column}.attention-row .text-link{margin-left:auto}}`}</style>
  </main>;
}
