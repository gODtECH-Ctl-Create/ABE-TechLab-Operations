import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: role }] = await Promise.all([
    supabase.from("user_profiles").select("id, display_name, created_at, updated_at").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_my_role" as never),
  ]);

  const record = (profile ?? { id: user.id, display_name: null, created_at: "", updated_at: "" }) as Profile;

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Account · Profile</div><h1>My profile</h1><p>Your personal identity and access context inside ABE TechLab Operations.</p></div>
      <Link className="ghost-button" href="/profile/about">About Operations →</Link>
    </header>

    <section className="detail-grid">
      <section className="card">
        <div className="eyebrow">Identity</div><h2>Profile information</h2>
        <div className="detail-fields profile-fields">
          <div><span>Name</span><strong>{record.display_name || "Name not set"}</strong></div>
          <div><span>Email</span><strong>{user.email || "Email unavailable"}</strong></div>
          <div><span>Workspace role</span><strong>{String(role ?? "Not assigned")}</strong></div>
          <div><span>Account status</span><strong>Active</strong></div>
        </div>
        <div className="inline-empty"><strong>Profile editing</strong><span>Personal profile editing can be enabled here without changing workspace permissions.</span></div>
      </section>

      <section className="card">
        <div className="eyebrow">Workspace context</div><h2>Understand the operation</h2>
        <div className="settings-link-list">
          <Link className="settings-link-row" href="/profile/about"><div><strong>About Operations</strong><span>Read the mission, workflow, roles, data rules, AI model and onboarding guide.</span></div><span>→</span></Link>
          <Link className="settings-link-row" href="/settings/notifications"><div><strong>Notifications</strong><span>Choose which workspace events should alert you.</span></div><span>→</span></Link>
          <Link className="settings-link-row" href="/settings/security"><div><strong>Security</strong><span>Review authentication and session controls.</span></div><span>→</span></Link>
          <Link className="settings-link-row" href="/settings"><div><strong>Workspace settings</strong><span>Manage team, permissions and integrations.</span></div><span>→</span></Link>
        </div>
      </section>
    </section>
  </main>;
}
