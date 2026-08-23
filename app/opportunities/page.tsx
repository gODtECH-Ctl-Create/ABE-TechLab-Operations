import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOpportunity, updateOpportunityStage } from "./actions";
import type { Database } from "@/lib/data/supabase/database.types";
import Link from "next/link";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const stages = [
  { id: "discovery", label: "Discovery" },
  { id: "qualification", label: "Qualification" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function OpportunitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const [{ data: opportunities, error }, { data: organisations }, { data: leads }] = await Promise.all([
    supabase.from("opportunities").select("id, organisation_id, lead_id, name, description, stage, value, currency, probability, expected_close_date, owner_id, next_action, next_action_due_at, source, created_at, updated_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("organisations").select("id, name").order("name", { ascending: true }).limit(200),
    supabase.from("leads").select("id, organisation_id, service_interest, status").order("created_at", { ascending: false }).limit(200),
  ]);
  if (error) throw new Error(error.message);

  const rows = (opportunities ?? []) as Opportunity[];
  const orgs = (organisations ?? []) as Pick<Organisation, "id" | "name">[];
  const leadRows = (leads ?? []) as Pick<Lead, "id" | "organisation_id" | "service_interest" | "status">[];
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const leadById = new Map(leadRows.map((l) => [l.id, l]));
  const open = rows.filter((o) => !["won", "lost"].includes(o.stage));
  const withoutNextAction = open.filter((o) => !o.next_action || !o.next_action_due_at || !o.owner_id).length;
  const pipelineValue = open.reduce((sum, o) => sum + Number(o.value ?? 0), 0);
  const weightedValue = open.reduce((sum, o) => sum + Number(o.value ?? 0) * Number(o.probability ?? 0) / 100, 0);
  const created = params.created === "1";
  const updated = params.updated === "1";
  const errorMessage = typeof params.error === "string" ? params.error : null;

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">CRM · Sales pipeline</div><h1>Opportunities</h1><p>Track real commercial opportunities from discovery through close. Every active opportunity should have an owner, a next action, and a due date.</p></div>
      <a className="ghost-button" href="/">← Dashboard</a>
    </header>

    {created && <div className="success-banner"><strong>Opportunity created.</strong><span>The opportunity is now in the live pipeline.</span></div>}
    {updated && <div className="success-banner"><strong>Opportunity updated.</strong><span>The latest stage, owner, and next-action changes have been recorded.</span></div>}
    {errorMessage && <div className="error-banner"><strong>Could not complete the action.</strong><span>{errorMessage === "next_action_owner_required" ? "Active opportunities require an owner, next action, and due date." : errorMessage}</span></div>}

    <section className="lead-summary">
      <div className="summary-card"><span>Open opportunities</span><strong>{open.length}</strong></div>
      <div className="summary-card"><span>Pipeline value</span><strong>{money.format(pipelineValue)}</strong></div>
      <div className="summary-card"><span>Weighted value</span><strong>{money.format(weightedValue)}</strong></div>
      <div className="summary-card"><span>Needs planning</span><strong>{withoutNextAction}</strong></div>
    </section>

    {(role === "admin" || role === "operator") && <section className="card">
      <div className="section-heading"><div><div className="eyebrow">Manual pipeline entry</div><h2>Create an opportunity</h2><p>New commercial work starts with a clear owner and next action.</p></div></div>
      {orgs.length === 0 ? <div className="empty-stage"><strong>No organisations available</strong><span>Create an organisation first.</span></div> : <form action={createOpportunity} className="research-form">
        <div className="research-form-grid">
          <label>Opportunity name<input name="name" required placeholder="Website redesign project" /></label>
          <label>Organisation<select name="organisation_id" required defaultValue=""><option value="" disabled>Select organisation</option>{orgs.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
          <label>Related lead<select name="lead_id" defaultValue=""><option value="">None</option>{leadRows.map((l) => <option value={l.id} key={l.id}>{orgById.get(l.organisation_id)?.name ?? "Unknown"} · {l.service_interest ?? "Lead"}</option>)}</select></label>
          <label>Value (NGN)<input name="value" type="number" min="0" step="1000" placeholder="2500000" /></label>
          <label>Probability (%)<input name="probability" type="number" min="0" max="100" placeholder="50" /></label>
          <label>Expected close<input name="expected_close_date" type="date" /></label>
          <label>Next action<input name="next_action" required placeholder="Schedule discovery call" /></label>
          <label>Next action due<input name="next_action_due_at" type="datetime-local" required /></label>
        </div>
        <label>Description<textarea name="description" placeholder="Scope, commercial context, next step..." /></label>
        <button className="primary-button" type="submit">Create opportunity →</button>
      </form>}
    </section>}

    <section className="card pipeline-card">
      <div className="section-heading"><div><div className="eyebrow">Live data</div><h2>Opportunity pipeline</h2><p>Move opportunities through the sales process while keeping accountability visible.</p></div><span className="badge">{rows.length} records</span></div>
      <div className="pipeline">
        {stages.map((stage) => { const stageRows = rows.filter((o) => o.stage === stage.id); return <div className="pipeline-column" key={stage.id}>
          <div className="pipeline-title"><span>{stage.label}</span><b>{stageRows.length}</b></div>
          {stageRows.map((opportunity) => { const lead = opportunity.lead_id ? leadById.get(opportunity.lead_id) : null; const nextDue = opportunity.next_action_due_at ? new Date(opportunity.next_action_due_at) : null; const overdue = nextDue ? nextDue.getTime() < Date.now() && !["won", "lost"].includes(opportunity.stage) : false; return <article className="lead-card" key={opportunity.id}>
            <div className="lead-score">{opportunity.probability ?? "--"}%</div>
            <h3><Link className="text-link" href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link></h3>
            <p>{orgById.get(opportunity.organisation_id)?.name ?? "Unknown organisation"}</p>
            {opportunity.value !== null && <small>{money.format(Number(opportunity.value))} · {opportunity.currency}</small>}
            {lead && <small>Lead: {lead.service_interest ?? "General"}</small>}
            <div className="recommended"><strong>Next action</strong><span>{opportunity.next_action ?? "Not set"}</span></div>
            <div className="recommended"><strong>Due</strong><span className={overdue ? "status-chip danger" : "status-chip"}>{nextDue ? nextDue.toLocaleString() : "Not scheduled"}</span></div>
            <Link className="text-link" href={`/opportunities/${opportunity.id}`}>View opportunity →</Link>
            {(role === "admin" || role === "operator") && <form action={updateOpportunityStage} className="status-form"><input type="hidden" name="opportunity_id" value={opportunity.id} /><label className="sr-only" htmlFor={`opp-stage-${opportunity.id}`}>Opportunity stage</label><select id={`opp-stage-${opportunity.id}`} name="stage" defaultValue={opportunity.stage}>{stages.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select><input type="hidden" name="owner_id" value={opportunity.owner_id ?? user.id} /><input type="hidden" name="next_action" value={opportunity.next_action ?? ""} /><input type="hidden" name="next_action_due_at" value={opportunity.next_action_due_at ? new Date(opportunity.next_action_due_at).toISOString() : ""} /><button type="submit" className="text-link">Update stage</button></form>}
          </article>; })}
          {stageRows.length === 0 && <div className="empty-stage">No opportunities</div>}
        </div>; })}
      </div>
    </section>
  </main>;
}
