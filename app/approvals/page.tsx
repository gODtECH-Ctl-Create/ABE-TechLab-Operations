"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Approval = {
  id: string;
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  proposed_by: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const query = supabase.from("approval_queue").select("*").order("created_at", { ascending: false });
    const { data, error } = filter === "all" ? await query : await query.eq("status", filter);
    if (error) setMessage(error.message);
    else setItems((data ?? []) as Approval[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filter]);

  const counts = useMemo(() => ({ pending: items.filter(i => i.status === "pending").length }), [items]);

  async function review(id: string, status: string) {
    setReviewing(id);
    setMessage("");
    const { error } = await supabase.from("approval_queue").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) setMessage(error.message);
    else await load();
    setReviewing(null);
  }

  return (
    <main className="main">
      <div className="header">
        <div>
          <div className="eyebrow">Governance</div>
          <h1>Approval queue</h1>
          <p className="header-subtitle">Review proposed actions before they affect leads, organisations, opportunities, or outreach.</p>
        </div>
        <div className="header-actions"><Link className="ghost-button" href="/dashboard">Back to dashboard</Link></div>
      </div>

      <section className="approval-toolbar card">
        <div>
          <strong>Human review</strong>
          <span>AI and automated workers can propose. Only approved actions should execute.</span>
        </div>
        <div className="approval-filters">
          {["pending", "changes_requested", "approved", "rejected", "all"].map(value => (
            <button key={value} className={filter === value ? "approval-filter active" : "approval-filter"} onClick={() => setFilter(value)}>{statusLabels[value] ?? "All"}</button>
          ))}
        </div>
      </section>

      {message && <div className="inline-message">{message}</div>}
      <section className="approval-list card">
        <div className="section-heading"><div><h2>Requests</h2><p>{filter === "pending" ? `${counts.pending} awaiting review` : "Review history and pending requests"}</p></div></div>
        {loading ? <div className="empty-stage"><strong>Loading approvals</strong><span>Fetching the latest review queue.</span></div> : items.length === 0 ? <div className="empty-stage"><strong>Nothing to review</strong><span>New proposals will appear here when a worker or operator creates them.</span></div> : (
          <div className="approval-items">
            {items.map(item => (
              <article className="approval-item" key={item.id}>
                <div className="approval-item-main">
                  <div className="approval-kicker"><span>{item.entity_type}</span><span>{item.action_type}</span><span className={`approval-status ${item.status}`}>{statusLabels[item.status] ?? item.status}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.description || "No additional description was provided."}</p>
                  <small>Proposed by {item.proposed_by} · {new Date(item.created_at).toLocaleString()}</small>
                </div>
                {item.status === "pending" && <div className="approval-actions"><button disabled={reviewing === item.id} onClick={() => review(item.id, "approved")}>Approve</button><button className="secondary" disabled={reviewing === item.id} onClick={() => review(item.id, "changes_requested")}>Request changes</button><button className="danger" disabled={reviewing === item.id} onClick={() => review(item.id, "rejected")}>Reject</button></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
