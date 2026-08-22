import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";
import { approveStrategy, rejectStrategy, approveCampaign, rejectCampaign } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Strategy = Database["public"]["Tables"]["outreach_strategies"]["Row"];
type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
type Message = Database["public"]["Tables"]["campaign_messages"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
const labels: Record<string, string> = { draft: "Draft", needs_review: "Needs review", approved: "Approved", archived: "Archived" };

export default async function ApprovalPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: strategyRows, error: strategiesError }, { data: campaignRows, error: campaignsError }] = await Promise.all([
    supabase.from("outreach_strategies").select("*").in("status", ["needs_review", "draft"]).order("created_at", { ascending: false }).limit(100),
    supabase.from("campaigns").select("*").in("status", ["draft"]).order("created_at", { ascending: false }).limit(100),
  ]);
  if (strategiesError) throw new Error(strategiesError.message);
  if (campaignsError) throw new Error(campaignsError.message);

  const pendingStrategies = (strategyRows ?? []) as Strategy[];
  const pendingCampaigns = (campaignRows ?? []) as Campaign[];
  const leadIds = [...new Set([...pendingStrategies.map((s) => s.lead_id), ...pendingCampaigns.map((c) => c.lead_id)].filter(Boolean))] as string[];
  const strategyIds = [...new Set(pendingCampaigns.map((c) => c.strategy_id))];
  const campaignIds = pendingCampaigns.map((c) => c.id);

  const [{ data: leadRows }, { data: strategyLinks }, { data: messageRows }] = await Promise.all([
    leadIds.length ? supabase.from("leads").select("id, service_interest, problem_summary, score, source, status").in("id", leadIds) : Promise.resolve({ data: [] }),
    strategyIds.length ? supabase.from("outreach_strategies").select("*").in("id", strategyIds) : Promise.resolve({ data: [] }),
    campaignIds.length ? supabase.from("campaign_messages").select("*").in("campaign_id", campaignIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);

  const leads = (leadRows ?? []) as Pick<Lead, "id" | "service_interest" | "problem_summary" | "score" | "source" | "status">[];
  const linkedStrategies = (strategyLinks ?? []) as Strategy[];
  const messages = (messageRows ?? []) as Message[];
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const strategyById = new Map(linkedStrategies.map((strategy) => [strategy.id, strategy]));
  const messagesByCampaign = new Map<string, Message[]>();
  for (const message of messages) messagesByCampaign.set(message.campaign_id, [...(messagesByCampaign.get(message.campaign_id) ?? []), message]);

  const total = pendingStrategies.length + pendingCampaigns.length;
  const changed = params.changed === "1";
  const error = typeof params.error === "string" ? params.error : null;
  const canApprove = ["admin", "operator", "reviewer"].includes(userRole);

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Governance · Human review</div><h1>Approval Queue</h1><p>Review the business context and proposed action before anything moves forward.</p></div><Link className="ghost-button" href="/">← Dashboard</Link></header>
    {changed && <div className="success-banner"><strong>Queue updated.</strong><span>The decision has been recorded in the audit trail.</span></div>}
    {error && <div className="error-banner"><strong>Could not complete the review action.</strong><span>{error}</span></div>}
    <section className="lead-summary"><div className="summary-card"><span>Pending items</span><strong>{total}</strong></div><div className="summary-card"><span>Strategies</span><strong>{pendingStrategies.length}</strong></div><div className="summary-card"><span>Campaigns</span><strong>{pendingCampaigns.length}</strong></div><div className="summary-card"><span>Mode</span><strong>Human</strong></div></section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Outreach strategy</div><h2>Strategies awaiting review</h2><p>See the purpose, audience, angle and related lead before approving.</p></div><span className="badge">{pendingStrategies.length} pending</span></div>
      <div className="approval-stack">{pendingStrategies.length === 0 ? <div className="empty-stage"><strong>Nothing waiting here</strong><span>New strategies will appear when they need human review.</span></div> : pendingStrategies.map((strategy) => { const lead = strategy.lead_id ? leadById.get(strategy.lead_id) : null; return <article className="approval-card" key={strategy.id}>
        <div className="approval-card-head"><div><span className="approval-type">Strategy</span><h3>{strategy.objective}</h3><p>{strategy.channel} · {strategy.service ?? "Service not set"}</p></div><span className="status-chip">{labels[strategy.status] ?? strategy.status}</span></div>
        <div className="approval-grid"><div><span>Persona</span><strong>{strategy.persona || "Not set"}</strong></div><div><span>Angle</span><strong>{strategy.angle || "Not set"}</strong></div><div><span>Value proposition</span><strong>{strategy.value_proposition || "Not set"}</strong></div><div><span>Confidence</span><strong>{strategy.confidence == null ? "Manual" : `${strategy.confidence}%`}</strong></div></div>
        {lead && <div className="approval-context"><div><span>Related lead</span><Link href={`/leads/${lead.id}`}>Open lead →</Link></div><p>{lead.problem_summary || "No problem summary recorded."}</p><small>{lead.service_interest || "Service not set"} · {lead.status.replaceAll("_", " ")} · score {lead.score ?? "not scored"} · {lead.source || "source not set"}</small></div>}
        <div className="approval-actions-row">{canApprove ? <><form action={approveStrategy}><input type="hidden" name="id" value={strategy.id} /><button className="primary-button" type="submit">Approve strategy</button></form><form action={rejectStrategy}><input type="hidden" name="id" value={strategy.id} /><button className="ghost-button" type="submit">Reject</button></form></> : <span className="status-chip">Review only</span>}</div>
      </article>; })}</div>
    </section>

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Campaign governance</div><h2>Campaigns awaiting approval</h2><p>Review the campaign direction and full drafted messages before approving.</p></div><span className="badge">{pendingCampaigns.length} pending</span></div>
      <div className="approval-stack">{pendingCampaigns.length === 0 ? <div className="empty-stage"><strong>No draft campaigns waiting</strong><span>Create a campaign from the Outreach workspace first.</span><Link href="/outreach">Open outreach →</Link></div> : pendingCampaigns.map((campaign) => { const strategy = strategyById.get(campaign.strategy_id); const lead = campaign.lead_id ? leadById.get(campaign.lead_id) : null; const campaignMessages = messagesByCampaign.get(campaign.id) ?? []; return <article className="approval-card" key={campaign.id}>
        <div className="approval-card-head"><div><span className="approval-type">Campaign</span><h3>{strategy?.objective ?? "Campaign"}</h3><p>{campaign.channel} · {campaignMessages.length} drafted message{campaignMessages.length === 1 ? "" : "s"}</p></div><span className="status-chip">Draft</span></div>
        {strategy && <div className="approval-context"><div><span>Campaign direction</span><Link href={`/outreach/strategy/${strategy.id}`}>Open strategy →</Link></div><p>{strategy.value_proposition || strategy.angle || "No value proposition recorded yet."}</p></div>}
        {lead && <div className="approval-context"><div><span>Related lead</span><Link href={`/leads/${lead.id}`}>Open lead →</Link></div><p>{lead.problem_summary || "No problem summary recorded."}</p></div>}
        <div className="approval-message-list">{campaignMessages.length === 0 ? <div className="empty-stage"><span>No messages drafted yet.</span></div> : campaignMessages.map((message) => <div className="approval-message" key={message.id}><div><span>{message.stage.replaceAll("_", " ")}</span><strong>{message.subject || "Untitled message"}</strong></div><p>{message.body}</p></div>)}</div>
        <div className="approval-actions-row">{canApprove ? <><form action={approveCampaign}><input type="hidden" name="id" value={campaign.id} /><button className="primary-button" type="submit">Approve campaign</button></form><form action={rejectCampaign}><input type="hidden" name="id" value={campaign.id} /><button className="ghost-button" type="submit">Reject</button></form></> : <span className="status-chip">Review only</span>}</div>
      </article>; })}</div>
    </section>
  </main>;
}
