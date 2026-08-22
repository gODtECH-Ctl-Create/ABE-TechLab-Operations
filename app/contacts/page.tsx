import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createContact } from "./actions";

type Contact = { id: string; organisation_id: string; name: string; role_title: string | null; email: string | null; phone: string | null; is_decision_maker: boolean; notes: string | null; created_at: string };
type Organisation = { id: string; name: string; industry: string | null; geography: string | null };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: contactRows, error: contactsError }, { data: organisationRows, error: organisationsError }] = await Promise.all([
    (supabase.from("contacts" as never) as any).select("id, organisation_id, name, role_title, email, phone, is_decision_maker, notes, created_at").order("name", { ascending: true }).limit(300),
    supabase.from("organisations").select("id, name, industry, geography").order("name", { ascending: true }).limit(300),
  ]);
  if (contactsError) throw new Error(contactsError.message);
  if (organisationsError) throw new Error(organisationsError.message);

  const contacts = (contactRows ?? []) as Contact[];
  const organisations = (organisationRows ?? []) as Organisation[];
  const organisationById = new Map(organisations.map((org) => [org.id, org]));
  const canCreate = ["admin", "operator"].includes(userRole);
  const created = params.created === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return <main className="page-shell">
    <header className="page-header"><div><div className="eyebrow">CRM · People</div><h1>Contacts</h1><p>Decision-makers and key people connected to the organisations ABE TechLab is pursuing.</p></div><Link className="ghost-button" href="/">← Dashboard</Link></header>
    {created && <div className="success-banner"><strong>Contact created.</strong><span>The person is now linked to the selected organisation.</span></div>}
    {error && <div className="error-banner"><strong>Could not save contact.</strong><span>{error === "required" ? "Select an organisation and provide a contact name." : error}</span></div>}

    <section className="lead-summary"><div className="summary-card"><span>Contacts</span><strong>{contacts.length}</strong></div><div className="summary-card"><span>Decision-makers</span><strong>{contacts.filter((contact) => contact.is_decision_maker).length}</strong></div><div className="summary-card"><span>Organisations</span><strong>{organisations.length}</strong></div><div className="summary-card"><span>Access</span><strong>{userRole}</strong></div></section>

    {canCreate ? <section className="card"><div className="section-heading"><div><div className="eyebrow">Manual intake</div><h2>Add a contact</h2><p>Create a structured person record rather than leaving relationship details inside notes.</p></div></div>
      {organisations.length === 0 ? <div className="empty-stage"><strong>Create an organisation first</strong><span>Contacts must belong to an organisation.</span><Link href="/organisations">Open organisations →</Link></div> : <form action={createContact} className="research-form"><div className="research-form-grid"><label>Organisation<select name="organisation_id" required defaultValue=""><option value="" disabled>Select organisation</option>{organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Name<input name="name" required placeholder="Jane Doe" /></label><label>Role / title<input name="role_title" placeholder="CEO, Head of IT, Marketing Director" /></label><label>Email<input name="email" type="email" placeholder="jane@example.com" /></label><label>Phone<input name="phone" placeholder="+234..." /></label><label className="check-field"><input name="is_decision_maker" type="checkbox" /> Decision-maker</label></div><label>Notes<textarea name="notes" placeholder="Context, relationship, buying influence, or other useful notes." /></label><button className="primary-button" type="submit">Create contact →</button></form>}
    </section> : <section className="card"><div className="eyebrow">Reviewer access</div><h2>Contact directory</h2><p className="section-copy">You can review contact records, while creation and edits remain restricted to administrators and operators.</p></section>}

    <section className="card"><div className="section-heading"><div><div className="eyebrow">Live records</div><h2>People directory</h2><p>Clear relationship context for every organisation.</p></div><span className="badge">{contacts.length} records</span></div>
      {contacts.length === 0 ? <div className="empty-stage"><strong>No contacts yet</strong><span>Add the first contact above.</span></div> : <div className="organisation-list">{contacts.map((contact) => { const org = organisationById.get(contact.organisation_id); return <article className="organisation-row" key={contact.id}><div className="organisation-avatar">{contact.name.slice(0,1).toUpperCase()}</div><div className="organisation-main"><strong>{contact.name}</strong><span>{contact.role_title ?? "Role not set"} · {org?.name ?? "Organisation not found"}</span><small>{contact.email ?? "No email"}{contact.phone ? ` · ${contact.phone}` : ""}</small></div><div className="organisation-meta"><b>{contact.is_decision_maker ? "Yes" : "No"}</b><small>decision-maker</small></div></article>; })}</div>}
    </section>
  </main>;
}
