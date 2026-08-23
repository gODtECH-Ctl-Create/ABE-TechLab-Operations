"use client";

import { useState } from "react";

export type RecordEntity = "organisation" | "lead" | "opportunity" | "contact";

export function RecordActions({ entity, id, editHref }: { entity: RecordEntity; id: string; editHref?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: "archive" | "trash") {
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch("/api/records/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      window.location.href = "/trash";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied");
      }
    } catch {
      // Sharing can be cancelled by the user. No error message needed.
    }
  }

  return (
    <div className="record-actions" aria-label="Record actions">
      {editHref && <a className="ghost-button" href={editHref}>Edit</a>}
      <button className="ghost-button" type="button" onClick={share}>Share</button>
      <button className="ghost-button" type="button" onClick={() => run("archive")} disabled={busy !== null}>{busy === "archive" ? "Archiving…" : "Archive"}</button>
      <button className="ghost-button danger-action" type="button" onClick={() => { if (window.confirm("Move this record to Trash? It can be restored later.")) run("trash"); }} disabled={busy !== null}>{busy === "trash" ? "Moving…" : "Move to Trash"}</button>
      {message && <span className="record-action-message" role="status">{message}</span>}
    </div>
  );
}
