import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const notifications = [
  ["New website leads", "Alert me when a new enquiry becomes a lead.", true],
  ["Approval requests", "Alert me when an outreach item needs human review.", true],
  ["Follow-ups due", "Remind me when a follow-up becomes due.", true],
  ["Research status", "Alert me when a research request completes or fails.", true],
  ["Opportunity changes", "Alert me when an opportunity changes stage.", false],
  ["System alerts", "Critical integration and delivery warnings.", true],
];

export default async function NotificationSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Settings · Notifications</div><h1>Notification preferences</h1><p>Define the events that deserve your attention without turning Operations into noise.</p></div><Link className="ghost-button" href="/settings">← Settings</Link></header>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Preferences</div><h2>Operational alerts</h2><p>These controls establish the notification model. Delivery channels can be connected later.</p></div></div>
      <div className="settings-toggle-list">{notifications.map(([title, description, enabled]) => <div className="settings-toggle-row" key={String(title)}><div><strong>{String(title)}</strong><span>{String(description)}</span></div><span className={enabled ? "status-chip" : "status-chip muted"}>{enabled ? "On" : "Off"}</span></div>)}</div>
    </section>
  </main>;
}
