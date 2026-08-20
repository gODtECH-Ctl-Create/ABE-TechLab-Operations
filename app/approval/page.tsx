import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";
import { approveStrategy, rejectStrategy, approveCampaign, rejectCampaign } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type StrategyReview = Pick<Database["public"]["Tables"]["outreach_strategies"]["Row"], "id" | "objective" | "service" | "channel" | "status" | "confidence" | "created_at">;
type CampaignReview = Pick<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "strategy_id" | "lead_id" | "status" | "channel" | "created_at">;

export default async function ApprovalPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: strategyRows, error: strategiesError }, { data: campaignRows, error: campaignsError }] = await Promise.all([
    supabase.from("outreach_strategies").select("id, objective, service, channel, status, confidence, created_at").in("status", ["needs_review", "draft"]).order("created_at", { ascending: false }).limit(100),
    supabase.from("campaigns").select("id, strategy_id, lead_id, status, channel, created_at").in("status", ["draft"]).order("created_at", { ascending: false }).limit(100),
  ]);
  if (strategiesError) throw new Error(strategiesError.message);
  if (campaignsError) throw new Error(campaignsError.message);

  const pendingStrategies = (strategyRows ?? []) as StrategyReview[];
  const pendingCampaigns = (campaignRows ?? []) as CampaignReview[];
  const total = pendingStrategies.length + pendingCampaigns.length;
  const changed = params.changed === "1";
  const error = typeof params.error === "string" ? params.error : null;
  const canApprove = ["admin", "operator", "reviewer"].includes(userRole);

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Governance · Human review</div><h1>Approval Queue</h1><p>Nothing generated or drafted becomes operationally active until a human explicitly approves it.</p></div>
      <a className="ghost-button" href="/">← Dashboard</a>
    </header>
    {changed && <div className="success-banner"><strong>Queue updated.</strong><span>The decision has been recorded in the system audit trail.</span></div>}
    {error && <div className="error-banner"><strong>Could not complete the review action.</strong><span>{error}</span></div>}
    <section className="lead-summary">
      <div className="summary-card"><span>Pending items</span><strong>{total}</strong></div>
      <div className="summary-card"><span>Strategies</span><strong>{pendingStrategies.length}</strong></div>
      <div className="summary-card"><span>Campaigns</span><strong>{pendingCampaigns.length}</strong></div>
      <div className="summary-card"><span>Mode</span><strong>Human</strong></div>
    </section>

    <section className="card">
      <div className="section-heading"><div><div className="eyebrow">Outreach strategy</div><h2>Strategies awaiting review</h2><p>Review objective, service, channel and confidence before allowing a strategy into the approved workflow.</p></div><span className="badge">{pendingStrategies.length} pending</span></div>
      <div className="compact-list">
        {pendingStrategies.length === 0 ? <div className="empty-stage"><strong>Nothing waiting here</strong><span>New strategies will appear when they need human review.</span></div> : pendingStrategies.map((strategy) => <article className="compact-row" key={strategy.id}>
          <div><strong>{strategy.objective}</strong><span>{strategy.channel} · {strategy.service ?? "Service not set"} · {strategy.status} · {strategy.confidence == null ? "Manual" : `${strategy.confidence}% confidence`}</span></div>
          {canApprove ? <div className="approval-actions"><form action={approveStrategy}><input type="hidden" name="id" value={strategy.id} /><button className="primary-button" type="submit">Approve</button></form><form action={rejectStrategy}><input type="hidden" name="id" value={strategy.id} /><button className="ghost-button" type="submit">Reject</button></form></div> : <span className="status-chip">Review only</span>}
        </article>)}
      </div>
    </section>

    <section className="card">
      <div className="section-heading"><div><div className="eyebrow">Campaign governance</div><h2>Campaigns awaiting approval</h2><p>Approval changes the campaign to an approved state. Activation remains a separate decision.</p></div><span className="badge">{pendingCampaigns.length} pending</span></div>
      <div className="compact-list">
        {pendingCampaigns.length === 0 ? <div className="empty-stage"><strong>No draft campaigns waiting</strong><span>Create a campaign from the Outreach workspace first.</span><a href="/outreach">Open outreach →</a></div> : pendingCampaigns.map((campaign) => <article className="compact-row" key={campaign.id}>
          <div><strong>Campaign · {campaign.channel}</strong><span>Created {new Date(campaign.created_at).toLocaleDateString()} · draft</span></div>
          {canApprove ? <div className="approval-actions"><form action={approveCampaign}><input type="hidden" name="id" value={campaign.id} /><button className="primary-button" type="submit">Approve</button></form><form action={rejectCampaign}><input type="hidden" name="id" value={campaign.id} /><button className="ghost-button" type="submit">Reject</button></form></div> : <span className="status-chip">Review only</span>}
        </article>)}
      </div>
    </section>
  </main>;
}
