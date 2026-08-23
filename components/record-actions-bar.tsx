"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const detailRoutes = [
  ["/organisations/", "organisation"],
  ["/leads/", "lead"],
  ["/opportunities/", "opportunity"],
  ["/contacts/", "contact"],
] as const;

type Entity = (typeof detailRoutes)[number][1];

export function RecordActionsBar() {
  const pathname = usePathname();
  const [busy, setBusy] = useState<"archive" | "trash" | null>(null);
  const [message, setMessage] = useState("");

  const match = detailRoutes.find(([prefix]) => pathname.startsWith(prefix));
  if (!match) return null;

  const [prefix, entity] = match;
  const id = pathname.slice(prefix.length).split("/")[0];
  if (!id) return null;

  function edit() {
    setMessage("");
    const form = document.querySelector("form");
    if (form instanceof HTMLFormElement) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      const field = form.querySelector("input, select, textarea");
      if (field instanceof HTMLElement) field.focus({ preventScroll: true });
    }
  }

  async function share() {
    setMessage("");
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setMessage("Sharing was cancelled");
    }
  }

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
      window.location.assign("/trash");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="record-actions-bar" aria-label="Record actions">
      <div className="record-actions-bar-inner">
        <span className="record-actions-bar-label">Record actions</span>
        <div className="record-actions-bar-buttons">
          <button type="button" className="record-action-button" onClick={edit}>Edit</button>
          <button type="button" className="record-action-button" onClick={share}>Share</button>
          <button type="button" className="record-action-button" disabled={busy !== null} onClick={() => run("archive")}>{busy === "archive" ? "Archiving…" : "Archive"}</button>
          <button type="button" className="record-action-button record-action-danger" disabled={busy !== null} onClick={() => { if (window.confirm("Move this record to Trash? It can be restored later.")) run("trash"); }}>{busy === "trash" ? "Moving…" : "Move to Trash"}</button>
        </div>
        {message && <span className="record-actions-bar-message" role="status">{message}</span>}
      </div>
    </div>
  );
}
