"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(url: string) {
    setLoading(true);
    setStatus("");
    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setStatus(await parseError(res, `Failed (${res.status})`));
        return;
      }
      const body = (await res.json()) as { verification_token?: string };
      setStatus(body.verification_token ? `Verification token (local debug): ${body.verification_token}` : "If your account exists, a verification email was sent.");
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
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Verification</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">Confirm studio access</h3>
          <p className="mt-2 text-sm text-muted-foreground">Use request or resend to receive your time-bound email token and complete setup safely.</p>
        </div>
      }
    >
      <Panel title="Verify Email" subtitle="Complete setup for your fotoz.io studio access.">
        <div className="space-y-3">
          <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={loading} onClick={() => submit('/auth/email/verify/request')}>Request</Button>
            <Button disabled={loading} variant="outline" onClick={() => submit('/auth/email/verify/resend')}>Resend</Button>
          </div>
        </div>
        {status ? <p className="mt-3 break-all text-sm text-muted-foreground">{status}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Have your token already?</span>
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/verify-email/confirm">Confirm verification</Link>
          <span className="text-muted-foreground">or</span>
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/login">Go to sign in</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
