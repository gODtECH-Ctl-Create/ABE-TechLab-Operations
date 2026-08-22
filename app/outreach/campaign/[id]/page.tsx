import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
type Strategy = Database["public"]["Tables"]["outreach_strategies"]["Row"];
type Message = Database["public"]["Tables"]["campaign_messages"]["Row"];
type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];

const labels: Record<string, string> = { draft: "Draft", approved: "Approved", active: "Active", paused: "Paused", completed: "Completed", cancelled: "Cancelled" };

export default async function OutreachCampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role))) redirect("/");

  const { data: campaign } = await (supabase.from("campaigns") as any).select("*").eq("id", id).maybeSingle();
  if (!campaign) notFound();
  const row = campaign as Campaign;

  const [{ data: strategyData }, { data: messages }, { data: audit }] = await Promise.all([
    supabase.from("outreach_strategies").select("*").eq("id", row.strategy_id).maybeSingle(),
    supabase.from("campaign_messages").select("*").eq("campaign_id", row.id).order("created_at", { ascending: true }),
    (supabase.from("audit_events") as any).select("id, action, actor_type, created_at, metadata").eq("entity_type", "campaign").eq("entity_id", row.id).order("created_at", { ascending: false }).limit(25),
  ]);

  const strategy = strategyData as Strategy | null;
  const campaignMessages = (messages ?? []) as Message[];
  const auditEvents = (audit ?? []) as AuditEvent[];

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Outreach · Campaign</div><h1>{strategy?.objective ?? "Campaign"}</h1><p>{row.channel} · {labels[row.status] ?? row.status}</p></div><Link className="ghost-button" href="/outreach">← Outreach</Link></header>
    <section className="lead-summary"><div className="summary-card"><span>Status</span><strong>{labels[row.status] ?? row.status}</strong></div><div className="summary-card"><span>Channel</span><strong>{row.channel}</strong></div><div className="summary-card"><span>Messages</span><strong>{campaignMessages.length}</strong></div><div className="summary-card"><span>Approved</span><strong>{row.approved_at ? new Date(row.approved_at).toLocaleDateString() : "Not approved"}</strong></div></section>
    <div className="detail-grid">
      <section className="card"><div className="eyebrow">Strategy</div><h2>Campaign direction</h2>{strategy ? <><p>{strategy.objective}</p><div className="detail-list"><div><dt>Service</dt><dd>{strategy.service || "Not set"}</dd></div><div><dt>Persona</dt><dd>{strategy.persona || "Not set"}</dd></div><div><dt>Angle</dt><dd>{strategy.angle || "Not set"}</dd></div><div><dt>Value proposition</dt><dd>{strategy.value_proposition || "Not set"}</dd></div></div><Link className="text-link" href={`/outreach/strategy/${strategy.id}`}>Open strategy →</Link></> : <p>Strategy not found.</p>}</section>
      <section className="card"><div className="eyebrow">Governance</div><h2>Sending boundary</h2><p>Messages are drafts only. Activation remains a separate human decision, and provider execution is intentionally disabled while the AI/outbound layer is paused.</p><span className="status-chip">{row.status === "approved" ? "Approved, not automatically sent" : "Human review required"}</span></section>
    </div>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Message sequence</div><h2>Draft messages</h2><p>Review the full sequence before any future provider integration.</p></div></div>{campaignMessages.length === 0 ? <div className="empty-stage">No messages drafted for this campaign.</div> : <div className="compact-list">{campaignMessages.map(message => <article className="compact-row" key={message.id}><div><strong>{message.subject || "Untitled message"}</strong><span>{message.stage.replaceAll("_", " ")} · {message.status}</span><p className="row-body">{message.body}</p></div><span className="status-chip">{message.status}</span></article>)}</div>}</section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Audit trail</div><h2>Campaign activity</h2><p>Approvals, status changes and other operational events.</p></div></div>{auditEvents.length === 0 ? <div className="empty-stage">No campaign activity recorded yet.</div> : <div className="activity-list">{auditEvents.map(event => <div className="activity-item" key={event.id}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor_type} · {new Date(event.created_at).toLocaleString()}</span></div>)}</div>}</section>
  </main>;
}
