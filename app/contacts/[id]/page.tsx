import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";
import { AccountsNavigation } from "@/components/workspace-navigation";
import { RecordActions } from "@/components/record-actions";
import { updateContact } from "../actions";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];

export default async function ContactDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: contact }, { data: organisations }] = await Promise.all([
    (supabase.from("contacts") as any).select("id, organisation_id, first_name, last_name, job_title, email, phone, is_decision_maker, notes, created_at, deleted_at").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("organisations").select("id, name, industry, geography").order("name", { ascending: true }).limit(300),
  ]);
  if (!contact) redirect("/contacts?error=contact_not_found");

  const record = contact as Contact;
  const accounts = (organisations ?? []) as Organisation[];
  const account = accounts.find((item) => item.id === record.organisation_id);
  const name = [record.first_name, record.last_name].filter(Boolean).join(" ");
  const canEdit = ["admin", "operator"].includes(userRole);
  const error = typeof query.error === "string" ? query.error : null;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">Accounts · Contact profile</div><h1>{name}</h1><p>{record.job_title ?? "Role not set"} · {account?.name ?? "Organisation not found"}</p></div><div className="header-actions"><Link className="ghost-button" href="/contacts">← Contacts</Link><RecordActions entity="contact" id={record.id} editHref="#contact-edit" /></div></header>
    <AccountsNavigation active="Contacts" />
    {query.updated === "1" ? <div className="success-banner"><strong>Contact updated.</strong><span>The relationship details are now current.</span></div> : null}
    {error ? <div className="error-banner"><strong>Could not save contact.</strong><span>{error === "duplicate_email" ? "Another active contact already uses this email address." : error === "required" ? "Name and organisation are required." : error}</span></div> : null}
    <section className="lead-summary"><div className="summary-card"><span>Relationship</span><strong>{record.is_decision_maker ? "Decision-maker" : "Contact"}</strong></div><div className="summary-card"><span>Email</span><strong>{record.email ? "Available" : "Missing"}</strong></div><div className="summary-card"><span>Phone</span><strong>{record.phone ? "Available" : "Missing"}</strong></div><div className="summary-card"><span>Account</span><strong>{account ? "Linked" : "Missing"}</strong></div></section>
    <section className="contact-profile-grid"><div className="card"><div className="eyebrow">Relationship context</div><h2>Account connection</h2><div className="relationship-context"><span>{(account?.name ?? "?").slice(0, 1).toUpperCase()}</span><div><strong>{account?.name ?? "Organisation unavailable"}</strong><small>{account?.industry ?? "Industry not set"} · {account?.geography ?? "Geography not set"}</small></div></div>{account ? <Link className="text-link top-space" href={`/organisations/${account.id}`}>Open account →</Link> : null}<div className="detail-fields top-space"><div><span>Email</span><strong>{record.email ? <a href={`mailto:${record.email}`}>{record.email}</a> : "Not provided"}</strong></div><div><span>Phone</span><strong>{record.phone ? <a href={`tel:${record.phone}`}>{record.phone}</a> : "Not provided"}</strong></div><div><span>Notes</span><strong>{record.notes ?? "No relationship notes recorded."}</strong></div></div></div>
      <div className="card" id="contact-edit"><div className="section-heading"><div><div className="eyebrow">Contact record</div><h2>{canEdit ? "Edit contact" : "Contact information"}</h2><p>Keep the person, role and contact channels connected to the correct account.</p></div><span className="badge">{userRole}</span></div>{canEdit ? <form action={updateContact} className="research-form"><input type="hidden" name="id" value={record.id} /><div className="research-form-grid"><label>Organisation<select name="organisation_id" required defaultValue={record.organisation_id}>{accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Name<input name="name" required defaultValue={name} /></label><label>Role / title<input name="role_title" defaultValue={record.job_title ?? ""} /></label><label>Email<input name="email" type="email" defaultValue={record.email ?? ""} /></label><label>Phone<input name="phone" defaultValue={record.phone ?? ""} /></label><label className="check-field"><input name="is_decision_maker" type="checkbox" defaultChecked={record.is_decision_maker} /> Decision-maker</label></div><label>Notes<textarea name="notes" defaultValue={record.notes ?? ""} /></label><button className="primary-button" type="submit">Save contact</button></form> : <div className="detail-fields"><div><span>Name</span><strong>{name}</strong></div><div><span>Role</span><strong>{record.job_title ?? "Not set"}</strong></div></div>}</div></section>
  </main>;
}
