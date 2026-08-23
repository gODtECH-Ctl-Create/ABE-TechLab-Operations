import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changeMemberRole, createWorkspaceInvitation } from "../actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];
type RoleRow = Database["public"]["Tables"]["user_roles"]["Row"];

export default async function TeamManagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (String(role) !== "admin") redirect("/settings/team");
  const [{ data: profiles }, { data: roles }, { data: invitations }] = await Promise.all([
    supabase.from("user_profiles").select("id, display_name, created_at, updated_at"),
    supabase.from("user_roles").select("user_id, role, created_at"),
    (supabase.from("workspace_invitations") as any).select("id,email,role,status,created_at").order("created_at", { ascending:false }).limit(50),
  ]);
  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  const error = typeof params.error === "string" ? params.error : null;
  return <main className="page-shell"><header className="page-header"><div><div className="eyebrow">Settings · Team administration</div><h1>Manage workspace access</h1><p>Assign roles and prepare controlled invitations for new administrators and operators.</p></div><Link className="ghost-button" href="/settings/team">← Team & Permissions</Link></header>
    {params.updated === "1" && <div className="success-banner"><strong>Role updated.</strong><span>The member now has the selected workspace role.</span></div>}
    {params.invited === "1" && <div className="success-banner"><strong>Invitation recorded.</strong><span>The intended role and email are stored for the secure authentication invitation step.</span></div>}
    {error && <div className="error-banner"><strong>Action failed.</strong><span>{error}</span></div>}
    <section className="card"><div className="section-heading"><div><div className="eyebrow">New member</div><h2>Prepare invitation</h2><p>The database stores the invitation; sending the authentication email must happen through a server-side Supabase Auth administration flow.</p></div></div><form action={createWorkspaceInvitation} className="research-form"><div className="research-form-grid"><label>Email<input type="email" name="email" required placeholder="admin@example.com" /></label><label>Role<select name="role" defaultValue="operator"><option value="admin">Admin</option><option value="operator">Operator</option><option value="reviewer">Reviewer</option></select></label></div><button className="primary-button" type="submit">Record invitation →</button></form></section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Access control</div><h2>Current members</h2><p>Role changes are executed through the protected administrator-only database function.</p></div></div><div className="compact-list">{(roles ?? []).map((r: RoleRow) => <div className="compact-row" key={r.user_id}><div><strong>{profileById.get(r.user_id)?.display_name || "Unnamed member"}</strong><span>{r.user_id}</span></div><form action={changeMemberRole} className="status-form"><input type="hidden" name="user_id" value={r.user_id}/><select name="role" defaultValue={r.role} aria-label="Workspace role"><option value="admin">Admin</option><option value="operator">Operator</option><option value="reviewer">Reviewer</option></select><button className="text-link" type="submit">Save</button></form></div>)}</div></section>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Invitations</div><h2>Invitation records</h2></div></div><div className="compact-list">{!invitations?.length ? <div className="empty-stage">No invitation records yet.</div> : invitations.map((invite:any) => <div className="compact-row" key={invite.id}><div><strong>{invite.email}</strong><span>{invite.role} · {new Date(invite.created_at).toLocaleString()}</span></div><span className="status-chip">{invite.status}</span></div>)}</div></section>
  </main>;
}
