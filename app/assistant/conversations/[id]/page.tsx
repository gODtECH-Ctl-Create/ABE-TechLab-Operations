import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { returnToAssistant, takeOverConversation } from "./actions";
import "../../assistant.css";

type Props = { params: Promise<{ id: string }> };

export default async function AssistantConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");
  const db = supabase as any;
  const { data: conversation } = await db.from("assistant_conversations").select("id,lead_id,channel,status,ai_enabled,workflow_id,current_step_id,last_message_at,started_at").eq("id", id).maybeSingle();
  if (!conversation) notFound();

  const leadPromise = db.from("leads").select("id,organisation_id,service_interest,problem_summary,preferred_contact_channel,status,score,source").eq("id", conversation.lead_id).single();
  const messagesPromise = db.from("assistant_messages").select("id,sender_type,content,message_type,created_at,metadata").eq("conversation_id", id).order("created_at", { ascending: true }).limit(100);
  const requirementsPromise = db.from("assistant_requirements").select("id,key,value,status,confidence,updated_at").eq("lead_id", conversation.lead_id).order("updated_at", { ascending: false }).limit(50);
  const actionsPromise = db.from("assistant_actions").select("id,action_type,tool_name,status,created_at,error").eq("conversation_id", id).order("created_at", { ascending: false }).limit(30);
  const workflowPromise = conversation.workflow_id ? db.from("assistant_workflows").select("id,name,service,description,version").eq("id", conversation.workflow_id).maybeSingle() : Promise.resolve({ data: null });
  const stepPromise = conversation.current_step_id ? db.from("assistant_workflow_steps").select("id,name,description,step_order,step_type").eq("id", conversation.current_step_id).maybeSingle() : Promise.resolve({ data: null });
  const [{ data: lead }, { data: messages }, { data: requirements }, { data: actions }, { data: workflow }, { data: step }] = await Promise.all([leadPromise, messagesPromise, requirementsPromise, actionsPromise, workflowPromise, stepPromise]);
  const { data: org } = lead?.organisation_id ? await db.from("organisations").select("id,name").eq("id", lead.organisation_id).maybeSingle() : { data: null };

  const channel = conversation.channel.replaceAll("_", " ");
  return <main className="page-shell assistant-page">
    <header className="page-header assistant-header"><div><div className="eyebrow">AI Operations · Conversation</div><h1>{org?.name ?? "Client conversation"}</h1><p>{lead?.service_interest ?? "Service not set"} · {channel}</p></div><Link className="ghost-button" href="/assistant">← Assistant</Link></header>
    <section className="assistant-detail-grid">
      <section className="table-card assistant-detail-conversation"><div className="section-heading"><div><div className="eyebrow">Conversation</div><h2>Client ↔ Assistant</h2></div><span className={`assistant-detail-status ${conversation.status === "human_active" ? "warn" : ""}`}>{conversation.ai_enabled ? "AI active" : "Human active"}</span></div>
        <div className="assistant-thread">{(messages ?? []).map((message: any) => <article key={message.id} className={`assistant-thread-message ${message.sender_type === "client" ? "client" : message.sender_type === "human" ? "human" : "assistant"}`}><div className="assistant-thread-meta"><strong>{message.sender_type === "client" ? "Client" : message.sender_type === "human" ? "Team" : "ABE Assistant"}</strong><time>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.content}</p></article>)}{!(messages?.length) && <div className="assistant-empty"><strong>No messages yet</strong><span>The channel has been created, but the conversation has not started.</span></div>}</div>
      </section>
      <aside className="assistant-detail-side">
        <section className="table-card"><div className="section-heading"><div><div className="eyebrow">Lead context</div><h2>Operational state</h2></div></div><div className="assistant-detail-fields"><div><span>Status</span><strong>{lead?.status ?? "Unknown"}</strong></div><div><span>Preferred channel</span><strong>{lead?.preferred_contact_channel?.replaceAll("_", " ") ?? "Not set"}</strong></div><div><span>Workflow</span><strong>{workflow?.name ?? "General discovery"}</strong></div><div><span>Current step</span><strong>{step?.name ?? "Initial discovery"}</strong></div></div></section>
        <section className="table-card"><div className="section-heading"><div><div className="eyebrow">Requirements</div><h2>Collected information</h2></div></div>{!(requirements?.length)?<div className="assistant-side-empty"><strong>None captured yet</strong><span>Requirements extracted from the conversation will appear here.</span></div>:<div className="assistant-requirements">{requirements.map((item:any)=><div key={item.id}><strong>{item.key}</strong><span>{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</span><small>{item.status}</small></div>)}</div>}</section>
        <section className="table-card"><div className="section-heading"><div><div className="eyebrow">Actions</div><h2>Assistant activity</h2></div></div>{!(actions?.length)?<div className="assistant-side-empty"><strong>No recorded actions</strong><span>Tool calls and other operational actions will appear here.</span></div>:<div className="assistant-actions-list">{actions.map((item:any)=><div key={item.id}><strong>{item.action_type}</strong><span>{item.tool_name ?? "Internal action"}</span><small>{new Date(item.created_at).toLocaleString()}</small></div>)}</div>}</section>
      </aside>
    </section>
    <section className="assistant-handoff-bar"><div><strong>{conversation.ai_enabled ? "AI is currently handling this conversation." : "A human team member is currently handling this conversation."}</strong><span>Use takeover for complex questions, negotiation or anything that needs human judgment.</span></div>{["admin","operator"].includes(String(role ?? "")) && (conversation.ai_enabled ? <form action={takeOverConversation}><input type="hidden" name="conversation_id" value={id}/><button className="primary-button" type="submit">Take over conversation</button></form> : <form action={returnToAssistant}><input type="hidden" name="conversation_id" value={id}/><button className="ghost-button" type="submit">Return to Assistant</button></form>)}</section>
  </main>;
}
