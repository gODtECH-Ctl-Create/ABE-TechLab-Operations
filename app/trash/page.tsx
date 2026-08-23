import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TrashPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!['admin','operator','reviewer'].includes(String(role))) redirect('/');
  const { data: rows, error } = await (supabase.from('deleted_records') as any).select('id, entity_type, entity_id, deleted_at, reason').order('deleted_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Workspace · Recycle bin</div><h1>Trash</h1><p>Records moved out of the active workspace are retained here for recovery and controlled review.</p></div><Link className="ghost-button" href="/">← Dashboard</Link></header>
    <section className="card"><div className="section-heading"><div><div className="eyebrow">Retention</div><h2>Trashed records</h2><p>Nothing here is permanently deleted by ordinary workspace actions.</p></div><span className="badge">{rows?.length ?? 0} records</span></div>
      {(rows?.length ?? 0) === 0 ? <div className="empty-stage"><strong>Trash is empty</strong><span>When a record is no longer needed in the active workspace, move it here instead of deleting it.</span></div> : <div className="compact-list">{rows!.map((row:any) => <div className="compact-row" key={row.id}><div><strong>{row.entity_type}</strong><span>{row.entity_id} · {row.reason ?? 'No reason supplied'}</span><small>{new Date(row.deleted_at).toLocaleString()}</small></div><span className="status-chip">Retained</span></div>)}</div>}
    </section>
    <section className="card" style={{marginTop:14}}><div className="eyebrow">Policy</div><h2>Why Trash exists</h2><p>Operational records are retained for history, accountability, recovery, and reporting. Restoration and permanent deletion will be restricted to administrator controls.</p></section>
  </main>;
}
