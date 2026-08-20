export default function NotFound() {
  return (
    <main className="main">
      <section className="error-state" aria-labelledby="not-found-title">
        <div className="error-state-icon" aria-hidden="true">404</div>
        <div>
          <div className="eyebrow">Operations</div>
          <h1 id="not-found-title">Page not found</h1>
          <p>The page you requested does not exist or has moved.</p>
          <div className="error-state-actions">
            <a className="primary-button" href="/">Return to dashboard</a>
            <a className="ghost-button" href="/leads">Open leads</a>
          </div>
        </div>
      </section>
    </main>
  );
}
