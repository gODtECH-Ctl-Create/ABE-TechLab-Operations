"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/confirm?next=/`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        window.location.assign("/");
        return;
      }

      setMessage("Account created. Check your email and confirm your address before signing in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="eyebrow">ABE TechLab</div>
        <h1>Create an Operations account</h1>
        <p>Use your work email to create access to the internal Operations workspace.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Confirm password
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required />
          </label>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          {message ? <div className="auth-message" role="status">{message}</div> : null}
          <button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
