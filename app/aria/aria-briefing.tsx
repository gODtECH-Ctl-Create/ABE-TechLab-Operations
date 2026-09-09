"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AriaBrief, AriaProposal } from "@/lib/ai/aria-output";

type BriefResponse = { ok: boolean; requestId: string; provider: string; model: string; brief: AriaBrief; tools: string[]; fallbackUsed: boolean; error?: string };
type RecentRun = { id: string; status: string; provider: string | null; model: string | null; created_at: string };
type Message = { role: "user" | "assistant"; content: string; proposal?: AriaProposal };
type ChatResponse = { ok: boolean; answer: string; proposal?: AriaProposal; error?: string };

const toolLabels: Record<string, string> = { get_leads: "Leads", get_opportunities: "Opportunities", get_invoices: "Invoices", get_recent_activity: "Recent activity", get_pending_approvals: "Pending approvals", get_runtime: "Runtime policy" };
const proposalLabels: Record<string, string> = { follow_up: "Follow-up", task: "Task", opportunity_update: "Opportunity update", outreach_strategy: "Outreach strategy", invoice_reminder: "Invoice reminder" };
const runTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";

function ProposalButton({ proposal, canPropose }: { proposal: AriaProposal; canPropose: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function submit() {
    setState("sending");
    try {
      const response = await fetch("/api/ai/aria/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proposal) });
      if (!response.ok) throw new Error();
      setState("sent");
    } catch { setState("error"); }
  }
  return <div className="aria-proposal"><div><span>{proposalLabels[proposal.type] ?? proposal.type}</span><strong>{proposal.title}</strong><p>{proposal.description}</p>{proposal.targetLabel ? <small>Target: {proposal.targetLabel}</small> : null}</div><button type="button" onClick={submit} disabled={!canPropose || state === "sending" || state === "sent"}>{state === "sent" ? "Sent for review" : state === "sending" ? "Submitting…" : canPropose ? "Send for approval" : "Operator approval required"}</button>{state === "error" ? <small className="aria-inline-error">Could not submit. Please retry.</small> : null}</div>;
}

function StructuredBrief({ brief, canPropose }: { brief: AriaBrief; canPropose: boolean }) {
  const sections = [["Urgent attention", brief.urgentItems], ["Commercial and finance signals", brief.commercialSignals], ["Pending human decisions", brief.pendingDecisions]] as const;
  return <div className="aria-structured-brief"><section className="aria-executive"><span>Executive summary</span><p>{brief.executiveSummary}</p></section>{sections.map(([title, items]) => <section key={title}><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No items identified.</p>}</section>)}<section><h3>Top recommendations</h3><div className="aria-recommendations">{brief.recommendations.map((item) => <article key={item.priority}><span>{item.priority}</span><div><strong>{item.title}</strong><p>{item.reason}</p>{item.proposal ? <ProposalButton proposal={item.proposal} canPropose={canPropose} /> : null}</div></article>)}</div></section>{brief.dataLimitations.length ? <section className="aria-limitations"><h3>Data limitations</h3><ul>{brief.dataLimitations.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}</div>;
}

export function AriaBriefing({ initialRuns, canPropose }: { initialRuns: RecentRun[]; canPropose: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  async function generateBrief() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/ai/aria/brief", { method: "POST" });
      const payload = await response.json() as BriefResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || "ARIA could not prepare the briefing.");
      setBrief(payload); setGeneratedAt(runTime(new Date().toISOString())); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ARIA could not prepare the briefing."); router.refresh(); }
    finally { setBusy(false); }
  }

  async function askAria(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || chatBusy) return;
    const history = [...messages, { role: "user" as const, content: message }];
    setMessages(history); setQuestion(""); setChatBusy(true); setError(null);
    try {
      const response = await fetch("/api/ai/aria/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: messages }) });
      const payload = await response.json() as ChatResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || "ARIA could not answer this question.");
      setMessages((current) => [...current, { role: "assistant", content: payload.answer, proposal: payload.proposal }]); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ARIA could not answer this question."); router.refresh(); }
    finally { setChatBusy(false); }
  }

  return <>
    <section className="aria-hero"><div className="aria-hero-copy"><span className="aria-presence"><i /> ARIA · Operations intelligence</span><h2>Your decision brief, grounded in live Operations data.</h2><p>Generate a structured briefing, ask follow-up questions, and send proposed actions for human approval.</p><div className="aria-hero-actions"><button className="primary-button aria-generate" type="button" onClick={generateBrief} disabled={busy}><span aria-hidden="true">✦</span>{busy ? "Reviewing Operations…" : brief ? "Refresh operations brief" : "Generate operations brief"}</button><span className="aria-readonly">Advisory + proposals · Human governed</span></div></div><div className="aria-orbit" aria-hidden="true"><span>ARIA</span><i /><i /><i /></div></section>
    {error ? <div className="error-banner aria-error" role="alert"><strong>ARIA could not complete this request.</strong><span>{error}</span><button type="button" onClick={() => setError(null)}>Dismiss</button></div> : null}
    <section className="aria-workspace-grid"><article className="card aria-output-card" aria-live="polite" aria-busy={busy}><div className="section-heading"><div><div className="eyebrow">Current briefing</div><h2>{brief ? "ARIA operations brief" : "Ready when you are"}</h2><p>{brief ? `Generated ${generatedAt}` : "Generate a brief to assess the latest data across the workspace."}</p></div>{brief ? <span className={`status-chip ${brief.fallbackUsed ? "warning" : "success"}`}>{brief.fallbackUsed ? "Fallback used" : "Primary route"}</span> : null}</div>{busy ? <div className="aria-loading"><span className="aria-loading-mark">✦</span><div><strong>ARIA is reviewing the workspace</strong><span>Checking pipeline, finance, approvals, and recent activity…</span></div><i /></div> : brief ? <StructuredBrief brief={brief.brief} canPropose={canPropose} /> : <div className="aria-empty"><span>✦</span><strong>No briefing generated yet</strong><p>ARIA uses summarized operational records and records each run for auditability.</p></div>}</article><aside className="aria-context-column"><section className="card aria-context-card"><div className="eyebrow">Evidence scope</div><h2>What ARIA reviews</h2><div className="aria-source-list">{["Leads and fit signals", "Opportunities and pipeline risk", "Invoices and payment position", "Pending human approvals", "Recent auditable activity"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div></section>{brief ? <section className="card aria-run-card"><div className="eyebrow">Run details</div><dl><div><dt>Provider</dt><dd>{brief.provider}</dd></div><div><dt>Model</dt><dd>{brief.model}</dd></div><div><dt>Request</dt><dd title={brief.requestId}>{brief.requestId.slice(0, 8)}…</dd></div><div><dt>Data sources</dt><dd>{brief.tools.length}</dd></div></dl><div className="aria-tools">{brief.tools.map((tool) => <span key={tool}>{toolLabels[tool] ?? tool}</span>)}</div></section> : null}</aside></section>
    <section className="card aria-chat-card"><div className="section-heading"><div><div className="eyebrow">Conversation</div><h2>Ask ARIA</h2><p>Explore the operational picture and turn recommendations into reviewable proposals.</p></div><span className="status-chip state-neutral">Current session</span></div><div className="aria-messages">{messages.length ? messages.map((message, index) => <div className={`aria-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "ARIA" : "You"}</span><p>{message.content}</p>{message.proposal ? <ProposalButton proposal={message.proposal} canPropose={canPropose} /> : null}</div>) : <div className="aria-chat-empty">Try: “Which opportunity needs attention first?” or “Prepare a follow-up proposal for the most urgent item.”</div>}{chatBusy ? <div className="aria-message assistant"><span>ARIA</span><p>Reviewing the latest Operations data…</p></div> : null}</div><form className="aria-chat-form" onSubmit={askAria}><label htmlFor="aria-question">Ask about leads, pipeline, finance, approvals, or next actions</label><div><textarea id="aria-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} rows={3} placeholder="Ask ARIA a follow-up question…" /><button className="primary-button" type="submit" disabled={chatBusy || !question.trim()}>{chatBusy ? "Thinking…" : "Ask ARIA"}</button></div></form></section>
    <section className="card aria-history-card"><div className="section-heading"><div><div className="eyebrow">Audit visibility</div><h2>Recent ARIA runs</h2><p>Latest briefing and follow-up activity recorded by the AI runtime.</p></div><span className="badge">{initialRuns.length} recent</span></div>{initialRuns.length ? <div className="aria-history-list">{initialRuns.map((run) => <div key={run.id}><span className={`status-chip ${run.status === "completed" ? "success" : run.status === "failed" ? "failed" : "info"}`}>{run.status}</span><strong>{run.provider ?? "Provider pending"}</strong><span>{run.model ?? "Model pending"}</span><time>{runTime(run.created_at)}</time></div>)}</div> : <div className="empty-stage"><strong>No ARIA runs yet</strong><span>Your first completed or failed run will appear here.</span></div>}</section>
  </>;
}
