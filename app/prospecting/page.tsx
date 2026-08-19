import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import type { Database, Json } from "../../lib/data/supabase/database.types";
import { createResearchRequest } from "./actions";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ResearchRequest = Database["public"]["Tables"]["research_requests"]["Row"];
type Role = "admin" | "operator" | "reviewer";
type EvidenceObject = { [key: string]: Json | undefined };

const statusLabel = (value: string) => value.replaceAll("_", " ");
const evidenceItems = (prospect: Prospect): EvidenceObject[] => {
  if (!Array.isArray(prospect.evidence)) return [];
  return prospect.evidence.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) as EvidenceObject[];
};

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
  const queued = typeof params.queued === "string";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div><div className="eyebrow">ARIA · Customer intelligence</div><h1>Prospect research</h1><p>Define who we should look for. Requests stay auditable and can be processed when the research engine is available.</p></div>
        <a className="ghost-button" href="/">← Dashboard</a>
      </header>
      {created ? <div className="success-banner"><strong>Research request queued.</strong><span>{queued ? "AI research is paused, so the request has been safely saved for later processing." : "The request and audit event are now in Supabase."}</span></div> : null}
      {error ? <div className="error-banner"><strong>Could not create the request.</strong><span>{error === "query_required" ? "Tell ARIA what kind of customers to research." : error}</span></div> : null}
      <section className="research-layout">
        <div className="card research-builder"><div className="eyebrow">New research run</div><h2>Find potential customers</h2><p className="section-copy">Start narrow. Define the customer type, market and industries so the research worker has a precise target.</p><div className="paused-notice"><strong>Research engine paused</strong><span>Your request will be saved to the queue. AI provider execution can be enabled later without losing the request.</span><a href="/ai">View AI Control Centre →</a></div>
          <form action={createResearchRequest} className="research-form"><label>What are we looking for?<textarea name="query" required placeholder="Nigerian organisations that need product strategy, software development or AI automation." /></label><div className="research-form-grid"><label>Geography<input name="geography" defaultValue="Nigeria" /></label><label>Industries<input name="industries" placeholder="Education, FinTech, Healthcare" /></label></div><div className="research-checks"><span>Queue will preserve:</span><span>✓ request</span><span>✓ qualification context</span><span>✓ audit event</span><span>✓ approval boundary</span></div><button className="primary-button" type="submit">Save research request →</button></form>
        </div>
        <aside className="card research-rules"><div className="eyebrow">Operating rules</div><h2>ARIA does not decide alone</h2><div className="rule"><b>01</b><span>Research gathers evidence and signals.</span></div><div className="rule"><b>02</b><span>Qualification scores fit, need, urgency and confidence.</span></div><div className="rule"><b>03</b><span>ABE TechLab reviews recommendations before external action.</span></div><div className="rule"><b>04</b><span>Approved actions are recorded in the audit trail.</span></div></aside>
      </section>
      <section className="card research-queue-card"><div className="section-heading"><div><div className="eyebrow">Research queue</div><h2>Recent requests</h2><p>Saved requests waiting for the research worker or showing their processing state.</p></div><span className="badge">{researchRequests.length} requests</span></div><div className="request-list">{researchRequests.length === 0 ? <div className="empty-stage"><strong>No research runs yet</strong><span>Create the first request above.</span></div> : researchRequests.map((request) => <div className="request-row" key={request.id}><div className="request-main"><strong>{request.query}</strong><span>{request.geography ?? "Any geography"} · {Array.isArray(request.industries) && request.industries.length ? request.industries.join(", ") : "Any industry"}</span></div><span className={`status-chip ${request.status === "queued" ? "queued" : ""}`}>{statusLabel(request.status)}</span><small>{new Date(request.created_at).toLocaleString()}</small></div>)}</div></section>
      <section className="card research-results-card"><div className="section-heading"><div><div className="eyebrow">Evidence review</div><h2>Top prospects</h2><p>Only research-backed prospects should compete for human attention.</p></div><span className="badge">{liveProspects.length} live</span></div><div className="live-prospect-grid">{liveProspects.length === 0 ? <div className="empty-stage"><strong>No prospects yet</strong><span>Queued requests will populate this view when the research worker is enabled.</span></div> : liveProspects.map((prospect) => { const organisation = organisationById.get(prospect.organisation_id); return <article className="live-prospect" key={prospect.id}><div className="live-prospect-top"><div><div className="eyebrow">{organisation?.industry ?? "Unknown industry"} · {organisation?.geography ?? "Unknown geography"}</div><h3>{organisation?.name ?? "Unknown organisation"}</h3></div><div className="prospect-score"><strong>{prospect.score ?? "—"}</strong><span>/100</span></div></div><p>{prospect.likely_need ?? "Likely need not established yet."}</p><div className="prospect-fields"><div><span>Recommended service</span><strong>{prospect.recommended_service ?? "Not established"}</strong></div><div><span>Confidence</span><strong>{prospect.confidence ?? "—"}%</strong></div><div><span>Status</span><strong>{statusLabel(prospect.status)}</strong></div></div><div className="evidence"><strong>Evidence</strong>{evidenceItems(prospect).slice(0, 3).map((item, index) => <div className="evidence-item" key={`${prospect.id}-${index}`}><span className={item.sourceType === "verified" ? "verified" : "inference"}>{String(item.sourceType ?? "source")}</span><p>{String(item.claim ?? "Evidence available")}</p><small>{String(item.source ?? "Research record")}</small></div>)}</div></article>; })}</div></section>
    </div>
  );
}
