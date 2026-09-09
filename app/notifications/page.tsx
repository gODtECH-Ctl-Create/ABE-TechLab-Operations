import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Workspace · Notifications</div><h1>Notifications</h1><p>Keep up with the operational events that need your attention.</p></div>
      <Link className="ghost-button" href="/settings/notifications">Notification settings →</Link>
    </header>

    <section className="card notifications-card">
      <div className="section-heading"><div><div className="eyebrow">Inbox</div><h2>Recent activity</h2><p>This area will show persisted operational notifications once notification delivery is connected.</p></div><span className="badge">0 live</span></div>
      <div className="empty-stage"><strong>No live notifications yet</strong><span>Nothing is being invented for display. Current priorities remain available on the Dashboard, Approval Queue, Follow-ups, and ARIA.</span><Link href="/">Open dashboard →</Link></div>
    </section>

    <style>{`.notifications-card{margin-top:14px}.notification-list{display:grid;gap:0}.notification-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:14px;align-items:start;padding:16px 0;border-top:1px solid #eceef0}.notification-row:first-child{border-top:0}.notification-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eef0f2;color:#17191c;font-size:18px}.notification-icon.review{background:#f0edf8}.notification-icon.reminder{background:#f8f1df}.notification-icon.system{background:#eceef0}.notification-row strong{display:block;font-size:12px}.notification-row p{margin:5px 0 4px;color:#747a83;font-size:11px;line-height:1.5}.notification-row small{color:#969ca4;font-size:10px}.notification-status{padding:5px 8px;border-radius:999px;background:#f1f2f3;color:#60666e;font-size:9px;font-weight:800}@media(max-width:560px){.notification-row{grid-template-columns:32px minmax(0,1fr)}.notification-status{grid-column:2;justify-self:start}.notification-row p{max-width:none}}`}</style>
  </main>;
}
