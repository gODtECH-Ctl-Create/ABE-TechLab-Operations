"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout auth-layout-login">
        <aside className="auth-story">
          <div className="auth-brand"><i /> ABE TechLab Operations</div>
          <div className="auth-story-copy"><div className="eyebrow">One operational source of truth</div><h2>See what matters. Decide what happens next.</h2><p>Manage the revenue pipeline, customer work, approvals, and ARIA intelligence from one governed workspace.</p></div>
          <div className="auth-principles"><div><strong>Live context</strong><span>Supabase-backed operational records</span></div><div><strong>Human governed</strong><span>Approval before consequential action</span></div><div><strong>Auditable</strong><span>Material activity leaves a record</span></div></div>
        </aside>
        <div className="auth-panel"><section className="auth-card">
          <div className="eyebrow">Secure workspace</div>
          <h1>Welcome back</h1>
          <p>Sign in with your Operations account to continue.</p>
          <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <div className="auth-links"><Link href="/signup">Create an account</Link><span>·</span><Link href="/reset-password">Forgot password?</Link></div>
          <div className="auth-assurance"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Access is protected by Supabase authentication and role-based permissions.</span></div>
        </section></div>
      </section>
    </main>
  );
}
