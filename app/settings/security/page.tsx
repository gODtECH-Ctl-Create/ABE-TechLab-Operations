import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SecuritySettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Settings · Security</div><h1>Security</h1><p>Review authentication and access posture for your Operations account.</p></div><Link className="ghost-button" href="/settings">← Settings</Link></header>
    <section className="detail-grid">
      <section className="card"><div className="eyebrow">Authentication</div><h2>Account security</h2><div className="detail-fields profile-fields"><div><span>Email</span><strong>{user.email || "Unavailable"}</strong></div><div><span>Authenticated</span><strong>Active session</strong></div><div><span>Workspace role</span><strong>{String(role ?? "Not assigned")}</strong></div></div></section>
      <section className="card"><div className="eyebrow">Access policy</div><h2>Workspace protection</h2><div className="settings-link-list"><div className="settings-link-row"><div><strong>Server-side credentials</strong><span>Provider secrets are not rendered into the browser.</span></div><span className="status-chip">Protected</span></div><div className="settings-link-row"><div><strong>Role enforcement</strong><span>Workspace roles are checked before protected screens load.</span></div><span className="status-chip">Enabled</span></div><div className="settings-link-row"><div><strong>External sending</strong><span>Outbound sending remains behind approval and provider configuration.</span></div><span className="status-chip">Paused</span></div></div></section>
    </section>
  </main>;
}
