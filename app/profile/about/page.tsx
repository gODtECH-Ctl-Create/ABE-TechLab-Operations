import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AboutOperationsPage() {
  return <main className="page-shell about-page">
    <header className="page-header">
      <div>
        <div className="eyebrow">Workspace · About</div>
        <h1>About ABE TechLab Operations</h1>
        <p>The internal handbook for understanding how the workspace works, why it exists, and how people, processes and automation fit together.</p>
      </div>
      <Link className="ghost-button" href="/profile">← My profile</Link>
    </header>

    <section className="card about-hero">
      <div className="eyebrow">The purpose</div>
      <h2>One operating system for business development and customer operations.</h2>
      <p>ABE TechLab Operations is the internal workspace used to turn scattered business-development activity into a structured, auditable and repeatable operating process. It connects research, prospecting, lead management, organisations, contacts, opportunities, outreach, approvals and follow-ups so the team can see what is happening, what needs attention and what should happen next.</p>
      <p>The goal is not to automate people out of the process. The goal is to make the operation easier to understand, easier to manage and increasingly intelligent while keeping human accountability where it matters.</p>
    </section>

    <section className="about-section">
      <div className="eyebrow">Vision</div>
      <h2>Where the Operations workspace is going</h2>
      <div className="about-grid">
        <div className="card"><h3>Repeatable growth</h3><p>Build a business-development process that can be repeated consistently instead of depending on memory, isolated spreadsheets or individual habits.</p></div>
        <div className="card"><h3>Operational clarity</h3><p>Make it obvious what a record is, where it sits in the lifecycle, who owns it and what action should happen next.</p></div>
        <div className="card"><h3>Measured execution</h3><p>Capture enough structured information to understand pipeline health, conversion, bottlenecks, response patterns and commercial outcomes.</p></div>
        <div className="card"><h3>Human + AI collaboration</h3><p>Use artificial intelligence for research, classification, scoring, drafting and recommendations while retaining human review over sensitive decisions and execution.</p></div>
      </div>
    </section>

    <section className="about-section">
      <div className="eyebrow">The operating model</div>
      <h2>How work moves through the workspace</h2>
      <div className="card"><ol className="about-workflow">
        <li><strong>Discover</strong><span>Identify organisations, people and potential business opportunities through inbound enquiries, referrals, manual prospecting or future automated research.</span></li>
        <li><strong>Qualify</strong><span>Determine whether a prospect is relevant enough to deserve active attention. Qualification can use fit, need, confidence, timing and other evidence.</span></li>
        <li><strong>Create or update a Lead</strong><span>Move qualified business-development records into the active lead pipeline so they can be worked deliberately.</span></li>
        <li><strong>Develop an Opportunity</strong><span>When there is a concrete potential engagement, create an opportunity tied to the organisation and relevant contacts.</span></li>
        <li><strong>Prepare Outreach</strong><span>Build a strategy around the target's problem, service fit, audience, angle, value proposition and communication channel.</span></li>
        <li><strong>Review</strong><span>Where human approval is required, prepared outreach enters the Approval Queue before operational execution.</span></li>
        <li><strong>Execute and follow up</strong><span>Approved communication can be sent through connected channels, with the next action and follow-up kept visible.</span></li>
        <li><strong>Progress the opportunity</strong><span>Update the commercial stage as conversations, proposals, negotiations and decisions happen.</span></li>
        <li><strong>Close and retain</strong><span>Record the outcome, preserve the history and continue the relationship through future work, renewals or additional opportunities.</span></li>
      </ol></div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Core records</div>
      <h2>What each workspace area means</h2>
      <div className="about-table-wrap card"><table className="about-table"><thead><tr><th>Area</th><th>Purpose</th><th>Primary question</th></tr></thead><tbody>
        <tr><td>Dashboard</td><td>Operational overview.</td><td>What needs attention right now?</td></tr>
        <tr><td>Research</td><td>Find and understand potential organisations.</td><td>Who should we investigate?</td></tr>
        <tr><td>Leads</td><td>Manage active business-development records.</td><td>Who are we working on?</td></tr>
        <tr><td>Organisations</td><td>Maintain company/account context.</td><td>What do we know about this organisation?</td></tr>
        <tr><td>Contacts</td><td>Maintain people linked to organisations.</td><td>Who are the relevant people?</td></tr>
        <tr><td>Opportunities</td><td>Track concrete commercial possibilities.</td><td>What business could we win?</td></tr>
        <tr><td>Outreach</td><td>Prepare and manage communication strategies and campaigns.</td><td>What should we say and why?</td></tr>
        <tr><td>Approval Queue</td><td>Human governance checkpoint.</td><td>Is this ready to be executed?</td></tr>
        <tr><td>Follow-ups</td><td>Track next actions and reminders.</td><td>What must happen next?</td></tr>
        <tr><td>Notifications</td><td>Surface important events.</td><td>What needs my attention?</td></tr>
      </tbody></table></div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Lead lifecycle</div>
      <h2>Prospect, lead and opportunity are not the same thing</h2>
      <div className="about-grid three">
        <div className="card"><h3>Prospect</h3><p>An organisation or person that has been identified as potentially relevant but has not yet earned a place in the active pipeline.</p></div>
        <div className="card"><h3>Lead</h3><p>A prospect or inbound contact that has enough relevance and context to enter the active business-development workflow.</p></div>
        <div className="card"><h3>Opportunity</h3><p>A specific commercial possibility where there is a meaningful engagement to pursue, such as a project, service need or potential contract.</p></div>
      </div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Human + AI</div>
      <h2>How automation fits into the operation</h2>
      <div className="card">
        <p><strong>Humans own accountability.</strong> People remain responsible for strategy, commercial decisions, relationship management, exceptions, sensitive actions and final approval where required.</p>
        <p><strong>AI provides assistance.</strong> The AI layer can support research, information extraction, qualification, scoring, summaries, drafting and recommendations.</p>
        <p><strong>Automation must remain understandable.</strong> Automated recommendations should be explainable enough for an operator or reviewer to understand what is being proposed and why.</p>
        <p><strong>AI execution is currently paused.</strong> The core Operations workflows remain usable without active AI provider execution. The AI Control Centre is intentionally kept out of the main navigation and is accessible through Profile → Settings → Integrations → AI Providers.</p>
      </div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Roles</div>
      <h2>Who does what</h2>
      <div className="about-grid four">
        <div className="card"><h3>Owner / Administrator</h3><p>Controls workspace configuration, team access, governance and sensitive settings.</p></div>
        <div className="card"><h3>Operator</h3><p>Works the commercial workflow: leads, organisations, contacts, opportunities, outreach and follow-ups.</p></div>
        <div className="card"><h3>Reviewer</h3><p>Provides human review for items that require approval before they become operational.</p></div>
        <div className="card"><h3>AI / System</h3><p>Assists with defined tasks and records its operational context without replacing human accountability.</p></div>
      </div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Daily operating routine</div>
      <h2>A simple routine for a newcomer</h2>
      <div className="card"><ol className="about-workflow compact">
        <li><strong>Start with Notifications</strong><span>Look for new leads, approvals, follow-ups and system warnings.</span></li>
        <li><strong>Open the Dashboard</strong><span>Check pipeline health, priority leads, opportunities and outstanding approvals.</span></li>
        <li><strong>Work assigned records</strong><span>Update the records you own instead of keeping important updates in private notes.</span></li>
        <li><strong>Keep next actions explicit</strong><span>Every active lead or opportunity should have a clear next step where appropriate.</span></li>
        <li><strong>Record outcomes</strong><span>Log important decisions, communication outcomes and status changes.</span></li>
        <li><strong>Close the loop</strong><span>Complete, reschedule or escalate follow-ups so work does not silently disappear.</span></li>
      </ol></div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Data discipline</div>
      <h2>Rules that keep the workspace trustworthy</h2>
      <div className="card"><ul className="about-rules">
        <li><strong>If it matters, record it.</strong> Important business context should live in the workspace, not only in private messages.</li>
        <li><strong>Use the correct record type.</strong> Do not use leads as a replacement for organisations, contacts or opportunities.</li>
        <li><strong>Use clear statuses.</strong> A status should describe the actual state of the work, not the hoped-for state.</li>
        <li><strong>Protect sensitive information.</strong> Credentials, provider keys and other secrets belong in secure configuration, not notes or public records.</li>
        <li><strong>Do not bypass approval controls.</strong> Governance checkpoints exist to make risky actions reviewable.</li>
        <li><strong>Treat AI output as assistance.</strong> Research and recommendations should be checked when accuracy matters.</li>
        <li><strong>Prefer one source of truth.</strong> Avoid creating parallel records in unrelated tools unless there is a deliberate integration.</li>
      </ul></div>
    </section>

    <section className="about-section">
      <div className="eyebrow">Find your way around</div>
      <h2>Where to go when you need something</h2>
      <div className="about-table-wrap card"><table className="about-table"><thead><tr><th>I need to…</th><th>Go to…</th></tr></thead><tbody>
        <tr><td>Find a potential organisation</td><td>Research</td></tr>
        <tr><td>Work an active prospect or enquiry</td><td>Leads</td></tr>
        <tr><td>Understand a company account</td><td>Organisations</td></tr>
        <tr><td>Find or manage a person</td><td>Contacts</td></tr>
        <tr><td>Track a commercial deal</td><td>Opportunities</td></tr>
        <tr><td>Prepare outreach</td><td>Outreach</td></tr>
        <tr><td>Review something before execution</td><td>Approval Queue</td></tr>
        <tr><td>See what I need to do next</td><td>Follow-ups</td></tr>
        <tr><td>See alerts</td><td>Notifications</td></tr>
        <tr><td>Manage my account</td><td>Profile</td></tr>
        <tr><td>Manage workspace configuration</td><td>Settings</td></tr>
        <tr><td>Configure AI providers</td><td>Profile → Settings → Integrations → AI Providers → AI Control Centre</td></tr>
      </tbody></table></div>
    </section>

    <section className="card about-close">
      <div className="eyebrow">Operating principle</div>
      <h2>Make the work visible. Make the next step clear.</h2>
      <p>ABE TechLab Operations is designed to turn business development from disconnected activity into a disciplined operating system. Every prospect should have a reason for being in the system. Every lead should have a meaningful status. Every opportunity should have a next action. Every outreach activity should have a purpose. Every approval should have accountability. Every important interaction should leave a record.</p>
    </section>

    <style>{`.about-hero{margin-top:14px;padding:28px}.about-hero h2{max-width:780px;font-size:28px;line-height:1.16;margin:8px 0 14px}.about-hero p,.about-section p{color:#6f757d;font-size:12px;line-height:1.7}.about-section{margin-top:28px}.about-section>h2{margin:7px 0 14px;font-size:20px}.about-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.about-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.about-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.about-grid .card{padding:20px}.about-grid h3{margin:0 0 7px;font-size:13px}.about-table-wrap{overflow:auto;padding:0}.about-table{width:100%;border-collapse:collapse;min-width:680px}.about-table th,.about-table td{text-align:left;padding:13px 15px;border-bottom:1px solid #eceef0;vertical-align:top;font-size:11px}.about-table th{font-size:10px;color:#80868e;text-transform:uppercase;letter-spacing:.05em}.about-table tr:last-child td{border-bottom:0}.about-workflow{margin:0;padding-left:22px}.about-workflow li{padding:11px 0 11px 5px;border-bottom:1px solid #eceef0}.about-workflow li:last-child{border-bottom:0}.about-workflow strong,.about-workflow span{display:block}.about-workflow strong{font-size:12px}.about-workflow span{margin-top:4px;color:#70767e;font-size:11px;line-height:1.55}.about-workflow.compact li{padding:10px 0}.about-rules{margin:0;padding-left:20px}.about-rules li{padding:7px 0;color:#70767e;font-size:11px;line-height:1.55}.about-rules strong{color:#1b1d20}.about-close{margin-top:28px;padding:24px}.about-close h2{margin:7px 0 10px;font-size:20px}.about-close p{max-width:860px}@media(max-width:900px){.about-grid.four{grid-template-columns:repeat(2,minmax(0,1fr))}.about-grid.three{grid-template-columns:1fr}.about-hero{padding:22px}.about-hero h2{font-size:24px}}@media(max-width:600px){.about-grid{grid-template-columns:1fr}.about-grid.four{grid-template-columns:1fr}.about-hero h2{font-size:22px}.about-section{margin-top:22px}}`}</style>
  </main>;
}
