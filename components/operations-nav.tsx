"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/outreach", label: "Outreach" },
  { href: "/follow-ups", label: "Follow-ups" },
  { href: "/approval", label: "Approval Queue" },
  { href: "/prospecting", label: "Research" },
  { href: "/contacts", label: "Contacts" },
  { href: "/organisations", label: "Organisations" },
  { href: "/reports", label: "Reports" },
];

export function OperationsNav() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const hidden = ["/login", "/signup", "/reset-password", "/auth"].some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <nav className="operations-nav" aria-label="Operations navigation">
      <Link href="/" className="operations-nav-brand" aria-label="ABE TechLab Operations home"><span className="operations-nav-dot" /> ABE TechLab <span>Operations</span></Link>
      <div className="operations-nav-links">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={active ? "operations-nav-link active" : "operations-nav-link"} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </div>
      <div className="operations-nav-tools">
        <Link href="/notifications" className="operations-nav-icon" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="operations-nav-notification-dot" aria-hidden="true" />
        </Link>
        <div className="operations-nav-profile-wrap">
          <button className="operations-nav-avatar" type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>A</button>
          {profileOpen && (
            <div className="operations-profile-popover" role="dialog" aria-label="Profile menu">
              <div className="operations-profile-identity">
                <div className="operations-profile-avatar-large">A</div>
                <div><strong>My profile</strong><span>ABE TechLab Operations</span></div>
              </div>
              <div className="operations-profile-links">
                <Link href="/profile" onClick={() => setProfileOpen(false)}><strong>Profile</strong><span>Personal details and access context</span></Link>
                <Link href="/profile/about" onClick={() => setProfileOpen(false)}><strong>About Operations</strong><span>Learn how the workspace works and why it exists</span></Link>
                <Link href="/settings" onClick={() => setProfileOpen(false)}><strong>Settings</strong><span>Workspace, team, security and integrations</span></Link>
                <Link href="/settings/notifications" onClick={() => setProfileOpen(false)}><strong>Notification preferences</strong><span>Choose which operational events alert you</span></Link>
                <Link href="/trash" onClick={() => setProfileOpen(false)}><strong>Trash</strong><span>Recover records removed from the active workspace</span></Link>
              </div>
              <button className="operations-profile-signout" type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
