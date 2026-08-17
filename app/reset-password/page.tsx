"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      });
      if (resetError) throw resetError;
      setMessage("If an account exists for that email, a password reset link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="eyebrow">ABE TechLab</div>
        <h1>Reset password</h1>
        <p>Enter your Operations account email and we&apos;ll send a reset link.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </label>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          {message ? <div className="auth-message" role="status">{message}</div> : null}
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
        <p className="auth-footer"><Link href="/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}
