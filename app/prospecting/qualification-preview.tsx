import { prospects } from "../../lib/prospecting/mock-data";
import { qualificationSummary } from "../../lib/qualification/service";

export default function QualificationPreview() {
  const results = qualificationSummary(prospects);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="eyebrow">ARIA qualification</div>
          <h2>Qualification preview</h2>
          <p>Baseline scoring generated from the prospect research data. AI reasoning can be layered on later.</p>
        </div>
      </div>
      <div className="list">
        {results.map(({ prospectId, organisationName, result }) => (
          <div className="row" key={prospectId}>
            <div>
              <strong>{organisationName}</strong>
              <small>{result.classification.toUpperCase()} fit · {result.confidence}% confidence · {result.recommendedService}</small>
              <small>{result.reasons.join(" ")}</small>
              <small><b>Next:</b> {result.nextAction}</small>
            </div>
            <span className="badge">{result.score}/100</span>
          </div>
        ))}
      </div>
    </section>
  );
}
