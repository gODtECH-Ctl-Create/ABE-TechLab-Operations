"use client";

import Link from "next/link";
import { useState } from "react";

export type RecordAction = {
  label: string;
  href?: string;
  formAction?: "trash";
  destructive?: boolean;
};

type Props = {
  shareTitle: string;
  shareText?: string;
  shareUrl?: string;
  trashAction?: (formData: FormData) => void | Promise<void>;
  recordId?: string;
  actions?: RecordAction[];
};

export function RecordActions({ shareTitle, shareText, shareUrl, trashAction, recordId, actions = [] }: Props) {
  const [sharing, setSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const url = shareUrl ?? window.location.href;
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText ?? "ABE TechLab Operations record", url });
      } else {
        await navigator.clipboard.writeText(url);
        window.alert("Record link copied.");
      }
    } finally {
      setSharing(false);
    }
  }

  return <div className="record-actions" aria-label="Record actions">
    {actions.filter((action) => !action.destructive).map((action) => action.href ? <Link className="ghost-button" href={action.href} key={action.label}>{action.label}</Link> : null)}
    <button className="ghost-button" type="button" onClick={handleShare} disabled={sharing}>{sharing ? "Sharing…" : "Share"}</button>
    {trashAction && recordId && <div className="record-actions-menu">
      <button className="ghost-button action-more" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>More ▾</button>
      {menuOpen && <div className="record-actions-dropdown">
        <Link href="/trash" onClick={() => setMenuOpen(false)}>Open Trash</Link>
        <form action={trashAction} onSubmit={() => { if (!window.confirm("Move this record to Trash? It can be restored later.")) return; setMenuOpen(false); }}>
          <input type="hidden" name="id" value={recordId} />
          <input type="hidden" name="reason" value="Moved from active workspace" />
          <button type="submit" className="danger-action">Move to Trash</button>
        </form>
      </div>}
    </div>}
  </div>;
}
