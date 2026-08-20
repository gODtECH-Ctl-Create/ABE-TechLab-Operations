"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/outreach", label: "Outreach" },
  { href: "/approval", label: "Approval Queue" },
  { href: "/prospecting", label: "Research" },
  { href: "/ai", label: "AI Control Centre" },
  { href: "/organisations", label: "Organisations" },
];

export function OperationsNav() {
  const pathname = usePathname();
  const hidden = ["/login", "/signup", "/reset-password", "/auth"].some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

  return (
    <nav className="operations-nav" aria-label="Operations navigation">
      <div className="operations-nav-brand"><span className="operations-nav-dot" /> ABE TechLab <span>Operations</span></div>
      <div className="operations-nav-links">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={active ? "operations-nav-link active" : "operations-nav-link"} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}
