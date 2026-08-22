import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFollowUp, updateFollowUpStatus } from "./actions";

type FollowUp = { id: string; campaign_message_id: string; lead_id: string; scheduled_for: string; status: string; blocked_reason: string | null; created_at: string };
type Message = { id: string; campaign_id: string; stage: string; subject: string | null; body: string; status: string };
type Lead = { id: string; organisation_id: string; service_interest: string | null; status: string };
type Organisation = { id: string; name: string };

const statusLabels: Record<string, string> = { pending: "Pending", eligible: "Eligible", sent: "Sent", cancelled: "Cancelled", blocked: "Blocked" };

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");
  const canWrite = ["admin", "operator"].includes(userRole);

  const [{ data: followUpRows, error: followUpsError }, { data: messageRows, error: messagesError }, { data: leadRows, error: leadsError }, { data: organisationRows, error: organisationsError }] = await Promise.all([
    supabase.from("follow_ups").select("id, campaign_message_id, lead_id, scheduled_for, status, blocked_reason, created_at").order("scheduled_for", { ascending: true }).limit(200),
    supabase.from("campaign_messages").select("id, campaign_id, stage, subject, body, status").order("created_at", { ascending: false }).limit(200),
    supabase.from("leads").select("id, organisation_id, service_interest, status").order("created_at", { ascending: false }).limit(200),
    supabase.from("organisations").select("id, name").order("name", { ascending: true }).limit(200),
  ]);
  if (followUpsError) throw new Error(followUpsError.message);
  if (messagesError) throw new Error(messagesError.message);
  if (leadsError) throw new Error(leadsError.message);
  if (organisationsError) throw new Error(organisationsError.message);

  const followUps = (followUpRows ?? []) as FollowUp[];
  const messages = (messageRows ?? []) as Message[];
  const leads = (leadRows ?? []) as Lead[];
  const organisations = (organisationRows ?? []) as Organisation[];
  const messageById = new Map(messages.map((message) => [message.id, message]));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const orgById = new Map(organisations.map((org) => [org.id, org]));
  const pending = followUps.filter((item) => ["pending", "eligible"].includes(item.status));
  const created = params.created === "1";
  const updated = params.updated === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Revenue engine · Follow-up</div><h1>Follow-ups</h1><p>Track the next human-controlled action for active outreach. Nothing is sent automatically.</p></div><Link className="ghost-button" href="/">← Dashboard</Link></header>
    {created && <div className="success-banner"><strong>Follow-up created.</strong><span>The next action is now visible in the Operations queue.</span></div>}
    {updated && <div className="success-banner"><strong>Follow-up updated.</strong><span>The status change was recorded in the audit trail.</span></div>}
    {error && <div className="error-banner"><strong>Could not complete the follow-up action.</strong><span>{error === "required" ? "Select a message, lead, and scheduled date." : error}</span></div>}

    <section className="lead-summary"><div className="summary-card"><span>Pending</span><strong>{pending.length}</strong></div><div className="summary-card"><span>Eligible</span><strong>{followUps.filter((item) => item.status === "eligible").length}</strong></div><div className="summary-card"><span>Sent</span><strong>{followUps.filter((item) => item.status === "sent").length}</strong></div><div className="summary-card"><span>Blocked</span><strong>{followUps.filter((item) => item.status === "blocked").length}</strong></div></section>

    {canWrite ? <section className="card"><div className="section-heading"><div><div className="eyebrow">Next action</div><h2>Schedule a follow-up</h2><p>Create the next planned action from an existing outreach message and lead.</p></div></div><form action={createFollowUp} className="research-form"><div className="research-form-grid"><label>Lead<select name="lead_id" required defaultValue=""><option value="" disabled>Select lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{orgById.get(lead.organisation_id)?.name ?? "Unknown organisation"} · {lead.service_interest ?? "Service not set"}</option>)}</select></label><label>Message<select name="campaign_message_id" required defaultValue=""><option value="" disabled>Select message</option>{messages.map((message) => <option key={message.id} value={message.id}>{message.subject ?? message.stage.replaceAll("_", " ")}</option>)}</select></label><label>Scheduled for<input name="scheduled_for" type="datetime-local" required /></label></div><button className="primary-button" type="submit">Schedule follow-up →</button></form></section> : <section className="card"><div className="eyebrow">Reviewer access</div><h2>Follow-up queue</h2><p className="section-copy">You can review scheduled actions. Creating and changing follow-ups is restricted to administrators and operators.</p></section>}

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Live queue</div><h2>Next actions</h2><p>Make every follow-up explicit, owned by a lead, and easy to understand.</p></div><span className="badge">{followUps.length} records</span></div>
      {followUps.length === 0 ? <div className="empty-stage"><strong>No follow-ups yet</strong><span>Schedule the first next action above after preparing outreach.</span></div> : <div className="approval-stack">{followUps.map((item) => { const message = messageById.get(item.campaign_message_id); const lead = leadById.get(item.lead_id); const org = lead ? orgById.get(lead.organisation_id) : null; return <article className="approval-card" key={item.id}><div className="approval-card-head"><div><span className="approval-type">Follow-up</span><h3>{org?.name ?? "Unknown organisation"}</h3><p>{message?.subject ?? message?.stage.replaceAll("_", " ") ?? "Outreach message"}</p></div><span className="status-chip">{statusLabels[item.status] ?? item.status}</span></div><div className="approval-grid"><div><span>Scheduled</span><strong>{new Date(item.scheduled_for).toLocaleString()}</strong></div><div><span>Lead</span><strong><Link className="text-link" href={`/leads/${item.lead_id}`}>Open lead →</Link></strong></div><div><span>Message status</span><strong>{message?.status ?? "Unknown"}</strong></div><div><span>Lead stage</span><strong>{lead?.status?.replaceAll("_", " ") ?? "Unknown"}</strong></div></div>{message?.body ? <div className="approval-message"><span>Planned message</span><p>{message.body}</p></div> : null}{item.blocked_reason ? <div className="inline-message">{item.blocked_reason}</div> : null}{canWrite && ["pending", "eligible"].includes(item.status) ? <div className="approval-actions-row"><form action={updateFollowUpStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="eligible" /><button className="primary-button" type="submit">Mark eligible</button></form><form action={updateFollowUpStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="blocked" /><button className="ghost-button" type="submit">Block</button></form><form action={updateFollowUpStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="cancelled" /><button className="ghost-button" type="submit">Cancel</button></form></div> : null}</article>; })}</div>}
    </section>
  </main>;
}
