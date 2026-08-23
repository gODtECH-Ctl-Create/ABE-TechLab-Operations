import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];

const permissionRows = [
  ["Dashboard", "View", "View", "View"],
  ["Leads", "Manage", "Manage", "Review"],
  ["Opportunities", "Manage", "Manage", "View"],
  ["Outreach", "Manage", "Manage", "Review"],
  ["Approval Queue", "Manage", "Review", "Review"],
  ["Team & permissions", "Manage", "Limited", "No access"],
  ["Integrations", "Manage", "View", "View"],
];

export default async function TeamSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (String(role ?? "") !== "admin") redirect("/settings");

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("user_profiles").select("id, display_name, created_at, updated_at"),
    supabase.from("user_roles").select("user_id, role, created_at"),
  ]);
  const profileRows = (profiles ?? []) as Profile[];
  const roleRows = (roles ?? []) as RoleRow[];
  const profileById = new Map(profileRows.map((item) => [item.id, item]));

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Settings · Team & Permissions</div><h1>Workspace access</h1><p>See who can access Operations and the role assigned to each account.</p></div><Link className="ghost-button" href="/settings">← Settings</Link></header>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Members</div><h2>Current workspace members</h2><p>Invitation and role changes are intentionally restricted to administrators.</p></div><span className="badge">{roleRows.length} members</span></div>
      <div className="compact-list">{roleRows.length === 0 ? <div className="empty-stage"><strong>No workspace roles found</strong><span>Users need an explicit role before accessing Operations.</span></div> : roleRows.map((item) => { const profile = profileById.get(item.user_id); return <div className="compact-row" key={item.user_id}><div><strong>{profile?.display_name || "Unnamed member"}</strong><span>{item.user_id}</span></div><span className="status-chip">{item.role}</span></div>; })}</div>
    </section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Role matrix</div><h2>What each role can do</h2><p>These are the intended workspace capabilities. Database policies remain the enforcement layer.</p></div></div>
      <div className="settings-permission-grid"><div className="permission-head"><strong>Area</strong><strong>Admin</strong><strong>Operator</strong><strong>Reviewer</strong></div>{permissionRows.map((row) => <div className="permission-row" key={row[0]}>{row.map((cell, index) => <span key={`${row[0]}-${index}`}>{cell}</span>)}</div>)}</div>
    </section>
    <section className="card settings-note"><div><div className="eyebrow">Invitations</div><h2>Add another admin or team member</h2><p>The UI is ready for invitations, but creating Auth accounts requires the dedicated Supabase project and its server-side Auth administration configuration. We are keeping that migration paused until the correct Operations Supabase project is confirmed.</p></div></section>
  </main>;
}
