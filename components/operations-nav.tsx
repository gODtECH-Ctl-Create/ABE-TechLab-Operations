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
  { href: "/ai", label: "AI Control Centre" },
];

export function OperationsNav() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
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
      <button className="operations-nav-signout" type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Sign out of ABE TechLab Operations">{signingOut ? "Signing out…" : "Sign out"}</button>
    </nav>
  );
}
