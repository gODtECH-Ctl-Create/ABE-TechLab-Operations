import "./research.css";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import type { Database } from "../../lib/data/supabase/database.types";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ResearchRequest = Database["public"]["Tables"]["research_requests"]["Row"];
type Role = "admin" | "operator" | "reviewer";

export async function createResearchRequest(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : (roleResult.data as Role | null);
  if (!role || !["admin", "operator"].includes(role)) redirect("/prospecting?error=unauthorized");
  const query = String(formData.get("query") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const industries = String(formData.get("industries") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!query) redirect("/prospecting?error=query_required");
  const { data: request, error } = await supabase.from("research_requests").insert({ query, geography, industries, status: "queued", provider: "aria" }).select("id").single();
  if (error || !request) redirect(`/prospecting?error=${encodeURIComponent(error?.message ?? "request_failed")}`);
  await supabase.from("audit_events").insert({ actor_type: "human", actor_id: user.id, action: "research.request_created", entity_type: "research_request", entity_id: request.id, metadata: { query, geography, industries, requested_by_role: role } });
  revalidatePath("/prospecting");
  revalidatePath("/");
  redirect(`/prospecting?created=${request.id}`);
}

function requestStatus(status: string) { return status.replaceAll("_", " "); }
function evidenceItems(prospect: Prospect) {
  if (!Array.isArray(prospect.evidence)) return [];
  return prospect.evidence.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

export default async function ProspectingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const roleResult = await supabase.rpc("get_my_role" as never);
  const role = roleResult.error ? null : (roleResult.data as Role | null);
  if (!role || !["admin", "operator", "reviewer"].includes(role)) redirect("/");

  const [{ data: requests, error: requestsError }, { data: prospects, error: prospectsError }, { data: organisations, error: organisationsError }] = await Promise.all([
    supabase.from("research_requests").select("id, query, geography, industries, status, provider, error_message, created_at, completed_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("prospects").select("id, organisation_id, status, likely_need, recommended_service, score, confidence, evidence, created_at, updated_at").order("score", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("organisations").select("id, name, industry, geography, website_url, created_at, updated_at").limit(100),
  ]);
  if (requestsError) throw new Error(requestsError.message);
  if (prospectsError) throw new Error(prospectsError.message);
  if (organisationsError) throw new Error(organisationsError.message);

  const researchRequests = (requests ?? []) as ResearchRequest[];
  const liveProspects = (prospects ?? []) as Prospect[];
  const liveOrganisations = (organisations ?? []) as Organisation[];
  const organisationById = new Map(liveOrganisations.map((organisation) => [organisation.id, organisation]));
  const created = typeof params.created === "string";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div><div className="eyebrow">ARIA · Customer intelligence</div><h1>Prospect research</h1><p>Define who we should look for. ARIA will queue the research, preserve the request and prepare the evidence needed for qualification.</p></div>
        <a className="ghost-button" href="/">← Dashboard</a>
      </header>
      {created ? <div className="success-banner"><strong>Research request queued.</strong><span>It is recorded in Supabase and the audit trail. The next worker can process it.</span></div> : null}
      {error ? <div className="error-banner"><strong>Could not create the research request.</strong><span>{error === "query_required" ? "Tell ARIA what kind of customers to research." : error}</span></div> : null}

      <section className="research-layout">
        <div className="card research-builder">
          <div className="eyebrow">New research run</div><h2>Find potential customers</h2><p className="section-copy">Keep the first research run narrow. A clear target gives ARIA better qualification signals and a cleaner review queue.</p>
          <form action={createResearchRequest} className="research-form">
            <label>What are we looking for?<textarea name="query" required placeholder="Example: Nigerian organisations that need product strategy, software development or AI automation." /></label>
            <div className="research-form-grid"><label>Geography<input name="geography" defaultValue="Nigeria" placeholder="Nigeria" /></label><label>Industries<input name="industries" placeholder="Education, FinTech, Healthcare" /></label></div>
            <div className="research-checks"><span>ARIA will preserve:</span><span>✓ research request</span><span>✓ qualification context</span><span>✓ audit event</span><span>✓ human approval boundary</span></div>
            <button className="primary-button" type="submit">Queue research run →</button>
          </form>
        </div>
        <aside className="card research-rules"><div className="eyebrow">Operating rules</div><h2>ARIA does not decide alone</h2><div className="rule"><b>01</b><span>Research gathers evidence and signals.</span></div><div className="rule"><b>02</b><span>Qualification scores fit, need, urgency and confidence.</span></div><div className="rule"><b>03</b><span>ABE TechLab reviews recommendations before external action.</span></div><div className="rule"><b>04</b><span>Approved changes are written to the live Operations record.</span></div></aside>
      </section>

      <section className="card research-queue-card"><div className="section-heading"><div><div className="eyebrow">Research queue</div><h2>Recent requests</h2><p>Requests are stored in the live data layer. A worker can process queued requests when the research provider is connected.</p></div><span className="badge">{researchRequests.length} requests</span></div>
        <div className="request-list">{researchRequests.length === 0 ? <div className="empty-stage"><strong>No research runs yet</strong><span>Create the first request above.</span></div> : researchRequests.map((request) => <div className="request-row" key={request.id}><div className="request-main"><strong>{request.query}</strong><span>{request.geography ?? "Any geography"} · {Array.isArray(request.industries) && request.industries.length ? request.industries.join(", ") : "Any industry"}</span></div><span className={`status-chip ${request.status === "queued" ? "queued" : ""}`}>{requestStatus(request.status)}</span><small>{new Date(request.created_at).toLocaleString()}</small></div>)}</div>
      </section>

      <section className="card research-results-card"><div className="section-heading"><div><div className="eyebrow">Evidence review</div><h2>Top prospects</h2><p>Only research-backed prospects should compete for human attention.</p></div><span className="badge">{liveProspects.length} live</span></div>
        <div className="live-prospect-grid">{liveProspects.length === 0 ? <div className="empty-stage"><strong>No prospects yet</strong><span>Queue a research run first. Processed prospects will appear here with evidence, score and confidence.</span></div> : liveProspects.map((prospect) => { const organisation = organisationById.get(prospect.organisation_id); return <article className="live-prospect" key={prospect.id}><div className="live-prospect-top"><div><div className="eyebrow">{organisation?.industry ?? "Unknown industry"} · {organisation?.geography ?? "Unknown geography"}</div><h3>{organisation?.name ?? "Unknown organisation"}</h3></div><div className="prospect-score"><strong>{prospect.score ?? "—"}</strong><span>/100</span></div></div><p>{prospect.likely_need ?? "Likely need not established yet."}</p><div className="prospect-fields"><div><span>Recommended service</span><strong>{prospect.recommended_service ?? "Not established"}</strong></div><div><span>Confidence</span><strong>{prospect.confidence ?? "—"}%</strong></div><div><span>Status</span><strong>{requestStatus(prospect.status)}</strong></div></div><div className="evidence"><strong>Evidence</strong>{evidenceItems(prospect).slice(0, 3).map((item, index) => <div className="evidence-item" key={`${prospect.id}-${index}`}><span className={item.sourceType === "verified" ? "verified" : "inference"}>{String(item.sourceType ?? "source")}</span><p>{String(item.claim ?? "Evidence available")}</p><small>{String(item.source ?? "Research record")}</small></div>)}</div></article>; })}</div>
      </section>
    </div>
  );
}
