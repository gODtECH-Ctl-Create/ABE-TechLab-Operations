"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type OverflowEntity = "organisation" | "lead" | "opportunity" | "contact";

type Props = { entity: OverflowEntity; id: string; href: string; label?: string };

export function RecordOverflowMenu({ entity, id, href, label = "More actions" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"archive" | "trash" | null>(null);
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  async function share() {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setMessage("Link copied"); }
    } catch { setMessage("Sharing cancelled"); }
  }

  async function run(action: "archive" | "trash") {
    setBusy(action); setMessage("");
    try {
      const response = await fetch("/api/records/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed"); setBusy(null); }
  }

  return (
    <div className="record-actions-menu-wrap" ref={ref}>
      <button type="button" className="record-actions-menu-trigger" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMessage(""); setOpen((value) => !value); }}>
        <span aria-hidden="true">•••</span>
      </button>
      {open && <div className="record-actions-menu" role="menu" onClick={(event) => event.stopPropagation()}>
        <Link className="record-actions-menu-item" href={href} role="menuitem" onClick={() => setOpen(false)}>Edit</Link>
        <button type="button" role="menuitem" onClick={share}>Share</button>
        <button type="button" role="menuitem" disabled={busy !== null} onClick={() => run("archive")}>{busy === "archive" ? "Archiving…" : "Archive"}</button>
        <button type="button" role="menuitem" className="record-actions-menu-danger" disabled={busy !== null} onClick={() => { if (window.confirm("Move this record to Trash? It can be restored later.")) run("trash"); }}>{busy === "trash" ? "Moving…" : "Move to Trash"}</button>
        {message && <span className="record-actions-menu-message" role="status">{message}</span>}
      </div>}
    </div>
  );
}
