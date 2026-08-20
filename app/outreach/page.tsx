import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCampaign, createCampaignMessage, createStrategy, updateCampaignStatus } from "./actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Strategy = Database["public"]["Tables"]["outreach_strategies"]["Row"];
type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
type Message = Database["public"]["Tables"]["campaign_messages"]["Row"];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const statusLabel: Record<string, string> = { draft: "Draft", needs_review: "Needs review", approved: "Approved", archived: "Archived", active: "Active", paused: "Paused", completed: "Completed", cancelled: "Cancelled" };

export default async function OutreachPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [prospectsResult, leadsResult, strategiesResult, campaignsResult, messagesResult] = await Promise.all([
    supabase.from("prospects").select("id, organisation_id, status, likely_need, recommended_service, score, confidence, evidence, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("leads").select("id, organisation_id, prospect_id, status, service_interest, problem_summary, score, source, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("outreach_strategies").select("id, prospect_id, lead_id, objective, service, persona, angle, value_proposition, talking_points, channel, sequence, messages, confidence, rationale, status, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("campaigns").select("id, strategy_id, lead_id, status, channel, approved_at, approved_by, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("campaign_messages").select("id, campaign_id, stage, subject, body, scheduled_for, status, provider_message_id, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const queryError = [prospectsResult.error, leadsResult.error, strategiesResult.error, campaignsResult.error, messagesResult.error].find(Boolean);
  if (queryError) throw new Error(queryError.message);

  const prospects = (prospectsResult.data ?? []) as Prospect[];
  const leads = (leadsResult.data ?? []) as Lead[];
  const strategies = (strategiesResult.data ?? []) as Strategy[];
  const campaigns = (campaignsResult.data ?? []) as Campaign[];
  const messages = (messagesResult.data ?? []) as Message[];
  const editable = ["admin", "operator"].includes(userRole);
  const error = typeof params.error === "string" ? params.error : null;
  const created = typeof params.created === "string" ? params.created : null;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Revenue engine · Outreach</div><h1>Outreach</h1><p>Prepare, review and control outbound communication. Sending is deliberately separated from drafting.</p></div><a className="ghost-button" href="/">← Dashboard</a></header>
    {created && <div className="success-banner"><strong>{created === "strategy" ? "Strategy created." : created === "campaign" ? "Campaign created." : "Message drafted."}</strong><span>The change is now visible in the outreach workspace.</span></div>}
    {params.updated === "1" && <div className="success-banner"><strong>Campaign updated.</strong><span>The status change has been recorded.</span></div>}
    {error && <div className="error-banner"><strong>Could not complete the action.</strong><span>{error}</span></div>}

    <section className="lead-summary"><div className="summary-card"><span>Strategies</span><strong>{strategies.length}</strong></div><div className="summary-card"><span>Needs review</span><strong>{strategies.filter(s => s.status === "needs_review").length}</strong></div><div className="summary-card"><span>Campaigns</span><strong>{campaigns.length}</strong></div><div className="summary-card"><span>Draft messages</span><strong>{messages.filter(m => m.status === "draft").length}</strong></div></section>

    {editable && <section className="card"><div className="section-heading"><div><div className="eyebrow">Manual preparation</div><h2>Create outreach strategy</h2><p>AI is paused, so operators can still prepare a complete human-reviewed outreach plan.</p></div><span className="badge">Human authored</span></div>
      {prospects.length === 0 ? <div className="empty-stage"><strong>No prospects available</strong><span>Create or import prospects first. AI research is not required for this page.</span><a href="/prospecting">Open prospecting →</a></div> : <form action={createStrategy} className="research-form"><div className="research-form-grid"><label>Prospect<select name="prospect_id" required defaultValue=""><option value="" disabled>Select prospect</option>{prospects.map(p => <option key={p.id} value={p.id}>{p.recommended_service ?? "Prospect"} · score {p.score ?? "--"}</option>)}</select></label><label>Lead<select name="lead_id" defaultValue=""><option value="">No linked lead</option>{leads.map(l => <option key={l.id} value={l.id}>{l.service_interest ?? "Lead"} · {l.status}</option>)}</select></label><label>Channel<select name="channel" defaultValue="email"><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option></select></label></div><label>Objective<input name="objective" required placeholder="Start a conversation about a website redesign" /></label><div className="research-form-grid"><label>Service<input name="service" placeholder="Web development" /></label><label>Persona<input name="persona" placeholder="Founder / CTO / Operations lead" /></label><label>Angle<input name="angle" placeholder="Relevant business pain or trigger" /></label></div><label>Value proposition<textarea name="value_proposition" placeholder="What is the useful outcome for this prospect?" /></label><button className="primary-button" type="submit">Save strategy for review →</button></form>}
    </section>}

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Review queue</div><h2>Outreach strategies</h2><p>Nothing is sent from this screen automatically. Approval is an explicit human action.</p></div><span className="badge">{strategies.length} strategies</span></div><div className="compact-list">{strategies.length === 0 ? <div className="empty-stage"><strong>No strategies yet</strong><span>Prepare the first strategy above.</span></div> : strategies.map(s => <article className="compact-row" key={s.id}><div><strong>{s.objective}</strong><span>{s.channel} · {s.service ?? "Service not set"} · {statusLabel[s.status] ?? s.status}</span></div><span className="status-chip">{s.confidence == null ? "Manual" : `${s.confidence}% confidence`}</span></article>)}</div></section>

    {editable && strategies.length > 0 && <section className="card"><div className="section-heading"><div><div className="eyebrow">Campaign setup</div><h2>Create campaign</h2><p>Campaigns start as drafts and require explicit approval before activation.</p></div></div><form action={createCampaign} className="research-form"><div className="research-form-grid"><label>Strategy<select name="strategy_id" required defaultValue=""><option value="" disabled>Select strategy</option>{strategies.filter(s => s.status !== "archived").map(s => <option key={s.id} value={s.id}>{s.objective}</option>)}</select></label><label>Lead<select name="lead_id" defaultValue=""><option value="">No linked lead</option>{leads.map(l => <option key={l.id} value={l.id}>{l.service_interest ?? "Lead"} · {l.status}</option>)}</select></label><label>Channel<select name="channel" defaultValue="email"><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option></select></label></div><button className="primary-button" type="submit">Create draft campaign →</button></form></section>}

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Campaign control</div><h2>Campaigns</h2><p>Draft, approve, pause and complete campaigns without triggering a provider.</p></div><span className="badge">{campaigns.length} campaigns</span></div><div className="compact-list">{campaigns.length === 0 ? <div className="empty-stage"><strong>No campaigns yet</strong><span>Create one from an outreach strategy.</span></div> : campaigns.map(c => <article className="compact-row" key={c.id}><div><strong>{strategies.find(s => s.id === c.strategy_id)?.objective ?? "Campaign"}</strong><span>{c.channel} · {statusLabel[c.status] ?? c.status} · {messages.filter(m => m.campaign_id === c.id).length} messages</span></div>{editable ? <form action={updateCampaignStatus} className="status-form"><input type="hidden" name="campaign_id" value={c.id} /><label className="sr-only" htmlFor={`campaign-status-${c.id}`}>Campaign status</label><select id={`campaign-status-${c.id}`} name="status" defaultValue={c.status}><option value="draft">Draft</option><option value="approved">Approved</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><button type="submit" className="text-link">Save</button></form> : <span className="status-chip">{statusLabel[c.status] ?? c.status}</span>}</article>)}</div></section>

    {editable && campaigns.length > 0 && <section className="card"><div className="section-heading"><div><div className="eyebrow">Message drafting</div><h2>Write campaign message</h2><p>Draft content here. Sending and provider execution remain separate.</p></div></div><form action={createCampaignMessage} className="research-form"><div className="research-form-grid"><label>Campaign<select name="campaign_id" required defaultValue=""><option value="" disabled>Select campaign</option>{campaigns.map(c => <option key={c.id} value={c.id}>{strategies.find(s => s.id === c.strategy_id)?.objective ?? "Campaign"}</option>)}</select></label><label>Stage<select name="stage" defaultValue="first_touch"><option value="first_touch">First touch</option><option value="follow_up_1">Follow-up 1</option><option value="follow_up_2">Follow-up 2</option></select></label></div><label>Subject<input name="subject" placeholder="A quick idea for your team" /></label><label>Message<textarea name="body" required placeholder="Write the message you want a human reviewer to approve..." /></label><button className="primary-button" type="submit">Save message draft →</button></form></section>}

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Message library</div><h2>Drafts and delivery history</h2><p>Provider delivery will be connected later. For now, the operational record is complete.</p></div><span className="badge">{messages.length} messages</span></div><div className="compact-list">{messages.length === 0 ? <div className="empty-stage"><strong>No messages drafted</strong><span>Create a campaign message when a campaign exists.</span></div> : messages.map(m => <article className="compact-row" key={m.id}><div><strong>{m.subject ?? "Untitled message"}</strong><span>{m.stage.replaceAll("_", " ")} · {statusLabel[m.status] ?? m.status} · {m.body.slice(0, 90)}{m.body.length > 90 ? "…" : ""}</span></div><span className="status-chip">{m.status}</span></article>)}</div></section>
  </main>;
}
