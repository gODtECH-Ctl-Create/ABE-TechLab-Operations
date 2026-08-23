import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const currentRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(currentRole)) redirect("/");
  const canManageWorkspace = currentRole === "admin";

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Workspace · Settings</div><h1>Settings</h1><p>Manage the workspace, team access, notifications, security and connected systems.</p></div><Link className="ghost-button" href="/profile">← My profile</Link></header>
    <section className="settings-grid">
      <Link className="card settings-section" href="/settings/team"><div className="eyebrow">People</div><h2>Team & Permissions</h2><p>Manage workspace members, roles, approval access and future invitations.</p><span className="text-link">Open team settings →</span></Link>
      {canManageWorkspace && <Link className="card settings-section" href="/settings/team/manage"><div className="eyebrow">Administrator</div><h2>Team administration</h2><p>Assign roles and prepare controlled invitations for new administrators and operators.</p><span className="text-link">Manage workspace access →</span></Link>}
      <Link className="card settings-section" href="/settings/notifications"><div className="eyebrow">Alerts</div><h2>Notifications</h2><p>Control lead, approval, follow-up and system notifications.</p><span className="text-link">Open notification settings →</span></Link>
      <Link className="card settings-section" href="/settings/security"><div className="eyebrow">Access</div><h2>Security</h2><p>Review authentication, session controls and security posture.</p><span className="text-link">Open security settings →</span></Link>
      <Link className="card settings-section" href="/settings/integrations"><div className="eyebrow">Connected systems</div><h2>Integrations</h2><p>Manage website, email, Supabase and AI provider connections.</p><span className="text-link">Open integrations →</span></Link>
    </section>
    <section className="card settings-note"><div><div className="eyebrow">Current access</div><h2>{currentRole === "admin" ? "Administrator" : currentRole === "operator" ? "Operator" : "Reviewer"}</h2><p>{canManageWorkspace ? "You can manage workspace-level settings and team permissions." : "Workspace-level team changes are restricted to administrators."}</p></div></section>
  </main>;
}
