"use client";

import { useEffect } from "react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the boundary intentionally quiet. Production errors should be surfaced
    // through the application UI without leaking provider credentials or stack traces.
  }, []);

  return (
    <main className="main">
      <section className="error-state" role="alert" aria-labelledby="error-title">
        <div className="error-state-icon" aria-hidden="true">!</div>
        <div>
          <div className="eyebrow">Operations error</div>
          <h1 id="error-title">Something went wrong</h1>
          <p>We could not load this workspace. Your data has not been removed. Try again, and if the problem continues, review the activity logs.</p>
          <div className="error-state-actions">
            <button className="primary-button" type="button" onClick={() => reset()}>Try again</button>
            <a className="ghost-button" href="/">Return to dashboard</a>
          </div>
        </div>
      </section>
    </main>
  );
}
