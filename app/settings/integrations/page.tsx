import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Settings · Integrations</div><h1>Connected systems</h1><p>Manage the services that connect to ABE TechLab Operations. Credentials remain server-side.</p></div>
      <Link className="ghost-button" href="/settings">← Settings</Link>
    </header>

    <section className="settings-grid">
      <Link className="card settings-section" href="/settings/integrations/ai">
        <div className="eyebrow">Intelligence</div><h2>AI Providers</h2><p>Open the AI Control Centre to review provider configuration, routing order, usage and failures.</p><span className="text-link">Open AI Control Centre →</span>
      </Link>
      <div className="card settings-section"><div className="eyebrow">Website</div><h2>Website intake</h2><p>Review the configured website-to-Operations intake connection and delivery status.</p><span className="status-chip">Connected</span></div>
      <div className="card settings-section"><div className="eyebrow">Database</div><h2>Supabase</h2><p>The Operations application uses its dedicated Supabase environment. Migration changes remain separately controlled.</p><span className="status-chip">Configured</span></div>
      <div className="card settings-section"><div className="eyebrow">Email</div><h2>Email provider</h2><p>Sending remains behind approval and provider configuration. Production sending can be enabled later.</p><span className="status-chip">Sending paused</span></div>
    </section>
  </main>;
}
