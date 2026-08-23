"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const detailRoutes = [
  ["/organisations/", "organisation"],
  ["/leads/", "lead"],
  ["/opportunities/", "opportunity"],
  ["/contacts/", "contact"],
] as const;

type Entity = (typeof detailRoutes)[number][1];

type MenuAction = "archive" | "trash";

export function RecordActionsBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<MenuAction | null>(null);
  const [message, setMessage] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const match = detailRoutes.find(([prefix]) => pathname.startsWith(prefix));
  if (!match) return null;

  const [prefix, entity] = match;
  const id = pathname.slice(prefix.length).split("/")[0];
  if (!id) return null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function edit() {
    setMessage("");
    setOpen(false);
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
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied");
      }
    } catch {
      // User cancelled the native share sheet.
    } finally {
      setOpen(false);
    }
  }

  async function run(action: MenuAction) {
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
      setOpen(false);
    }
  }

  return (
    <div className="record-actions-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="record-actions-menu-trigger"
        aria-label="Open record actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">•••</span>
      </button>

      {open && (
        <div className="record-actions-menu" role="menu" aria-label="Record actions">
          <button type="button" role="menuitem" onClick={edit}>Edit</button>
          <button type="button" role="menuitem" onClick={share}>Share</button>
          <button type="button" role="menuitem" disabled={busy !== null} onClick={() => run("archive")}>{busy === "archive" ? "Archiving…" : "Archive"}</button>
          <button
            type="button"
            role="menuitem"
            className="record-actions-menu-danger"
            disabled={busy !== null}
            onClick={() => {
              if (window.confirm("Move this record to Trash? It can be restored later.")) run("trash");
            }}
          >
            {busy === "trash" ? "Moving…" : "Move to Trash"}
          </button>
        </div>
      )}

      {message && <span className="record-actions-menu-message" role="status">{message}</span>}
    </div>
  );
}
