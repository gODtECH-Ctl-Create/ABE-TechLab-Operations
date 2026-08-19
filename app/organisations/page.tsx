import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrganisation } from "./actions";
import type { Database } from "@/lib/data/supabase/database.types";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type LeadSummary = Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "organisation_id" | "status" | "score">;

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const [{ data: organisations, error }, { data: leads }] = await Promise.all([
    supabase.from("organisations").select("id, name, industry, geography, website_url, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("leads").select("id, organisation_id, status, score"),
  ]);
  if (error) throw new Error(error.message);

  const records = (organisations ?? []) as Organisation[];
  const leadRecords = (leads ?? []) as LeadSummary[];
  const leadCounts = new Map<string, number>();
  for (const lead of leadRecords) {
    if (!lead.organisation_id) continue;
    leadCounts.set(lead.organisation_id, (leadCounts.get(lead.organisation_id) ?? 0) + 1);
  }
  const created = params.created === "1";
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const canEdit = ["admin", "operator"].includes(userRole);

  return <main className="page-shell">
    <header className="page-header">
      <div><div className="eyebrow">Customer system · {userRole}</div><h1>Organisations</h1><p>The accounts ABE TechLab knows, is researching, or is actively pursuing.</p></div>
      <a className="ghost-button" href="/">← Dashboard</a>
    </header>
    {created ? <div className="success-banner"><strong>Organisation created.</strong><span>The account is now available to the Operations system.</span></div> : null}
    {errorMessage ? <div className="error-banner"><strong>Could not complete the organisation action.</strong><span>{errorMessage === "name_required" ? "Organisation name is required." : errorMessage}</span></div> : null}
    <section className="organisation-layout">
      {canEdit ? <div className="card organisation-builder"><div className="eyebrow">New account</div><h2>Add organisation</h2><p className="section-copy">Create an account manually while AI research is paused. You can enrich it later.</p>
        <form action={createOrganisation} className="organisation-form">
          <label>Organisation name<input name="name" required placeholder="Example: Acme Technologies" /></label>
          <div className="organisation-form-grid"><label>Industry<input name="industry" placeholder="FinTech, Education, Healthcare" /></label><label>Geography<input name="geography" placeholder="Lagos, Nigeria" /></label></div>
          <label>Website<input name="website_url" type="url" placeholder="https://example.com" /></label>
          <button className="primary-button" type="submit">Create organisation →</button>
        </form>
      </div> : <div className="card organisation-builder"><div className="eyebrow">Reviewer access</div><h2>Organisation directory</h2><p className="section-copy">You have review access. Organisation creation and editing are restricted to administrators and operators.</p></div>}
      <div className="card organisation-list-card"><div className="section-heading"><div><div className="eyebrow">Live records</div><h2>Account directory</h2><p>Real organisations from Supabase, with linked lead counts.</p></div><span className="badge">{records.length} records</span></div>
        <div className="organisation-list">{records.length === 0 ? <div className="empty-stage"><strong>No organisations yet</strong><span>Create the first account to start building the customer system.</span></div> : records.map((organisation) => <a className="organisation-row" href={`/organisations/${organisation.id}`} key={organisation.id}><div className="organisation-avatar">{organisation.name.slice(0, 1).toUpperCase()}</div><div className="organisation-main"><strong>{organisation.name}</strong><span>{organisation.industry ?? "Industry not set"} · {organisation.geography ?? "Geography not set"}</span></div><div className="organisation-meta"><b>{leadCounts.get(organisation.id) ?? 0}</b><small>leads</small></div><span className="chevron">→</span></a>)}</div>
      </div>
    </section>
  </main>;
}
