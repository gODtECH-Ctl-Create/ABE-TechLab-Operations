export default function Loading() {
  return (
    <main className="main">
      <section className="loading-stage loading-stage-branded" role="status" aria-live="polite" aria-label="Loading ABE TechLab Operations">
        <div className="abe-loader" aria-hidden="true">
          <span className="abe-loader-ring" />
          <span className="abe-loader-mark">ABE</span>
        </div>
        <strong>ABE TechLab</strong>
        <span>Preparing Operations workspace…</span>
      </section>
    </main>
  );
}
