"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("If the account exists, a reset email has been sent.");
        return;
      }
      setStatus(await parseError(res, `Request failed (${res.status})`));
    } catch {
      setStatus(apiNetworkErrorMessage(baseUrl));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      aside={
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Security</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">Account Recovery</h3>
          <p className="mt-2 text-sm text-muted-foreground">Reset links are single-use and time-bound so studio and client workflows stay protected.</p>
        </div>
      }
    >
      <Panel title="Forgot Password" subtitle="Recover access to your fotoz.io studio securely.">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input type="email" placeholder="you@company.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
        {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        <div className="mt-4 text-sm">
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/reset-password">Already have reset token? Continue</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
