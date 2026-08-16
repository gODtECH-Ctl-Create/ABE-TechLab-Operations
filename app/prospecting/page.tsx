import { prospects, prospectingRequests } from "../../lib/prospecting/mock-data";

export default function ProspectingPage() {
  const request = prospectingRequests[0];

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">ARIA · Outbound intelligence</div>
          <h1>Prospecting</h1>
          <p>Research potential customers, understand the opportunity and review them before they enter the lead pipeline.</p>
        </div>
        <button className="primary-button">+ New research request</button>
      </header>

      <section className="card prospect-request">
        <div>
          <div className="eyebrow">Current research request</div>
          <h2>{request.name}</h2>
          <p>{request.service} · {request.geography} · {request.industries.join(", ")}</p>
        </div>
        <span className="badge">{request.status}</span>
      </section>

      <section className="prospect-grid">
        {prospects.map((prospect) => (
          <article className="card prospect-card" key={prospect.id}>
            <div className="prospect-card-top">
              <div>
                <div className="eyebrow">{prospect.industry} · {prospect.geography}</div>
                <h2>{prospect.organisationName}</h2>
              </div>
              <div className="prospect-score"><strong>{prospect.score}</strong><span>/100</span></div>
            </div>

            <p>{prospect.description}</p>

            <div className="prospect-fields">
              <div><span>Likely need</span><strong>{prospect.likelyNeed}</strong></div>
              <div><span>Recommended service</span><strong>{prospect.recommendedService}</strong></div>
              <div><span>Potential decision maker</span><strong>{prospect.decisionMakerRole}</strong></div>
              <div><span>Research confidence</span><strong>{prospect.confidence}%</strong></div>
            </div>

            <div className="evidence">
              <strong>Research evidence</strong>
              {prospect.evidence.map((item) => (
                <div className="evidence-item" key={item.claim}>
                  <span className={item.sourceType === "verified" ? "verified" : "inference"}>{item.sourceType}</span>
                  <p>{item.claim}</p>
                  <small>{item.source}</small>
                </div>
              ))}
            </div>

            <div className="prospect-actions">
              <button className="secondary-button">Reject</button>
              <button className="secondary-button">Approve</button>
              <button className="primary-button">Convert to lead</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
