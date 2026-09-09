import Link from "next/link";

export type WorkspaceTab = {
  href: string;
  label: string;
  description?: string;
};

export function WorkspaceTabs({ label, tabs, active }: { label: string; tabs: WorkspaceTab[]; active: string }) {
  return (
    <nav className="workspace-tabs" aria-label={label}>
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={tab.label === active ? "active" : undefined} aria-current={tab.label === active ? "page" : undefined}>
          <strong>{tab.label}</strong>
          {tab.description ? <span>{tab.description}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
