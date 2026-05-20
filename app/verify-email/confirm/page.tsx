"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

export default function VerifyEmailConfirmPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);


  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/auth/email/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setStatus("Email verified successfully.");
        return;
      }
      setStatus(await parseError(res, `Verification failed (${res.status})`));
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
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Token Confirm</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">Complete account activation</h3>
          <p className="mt-2 text-sm text-muted-foreground">Enter your token from email to activate secure studio access.</p>
        </div>
      }
    >
      <Panel title="Confirm Verification" subtitle="Verify your fotoz.io account using your email link or pasted token.">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Verification token" value={token} onChange={(e) => setToken(e.target.value)} required />
          <Button disabled={loading}>{loading ? "Confirming..." : "Confirm email"}</Button>
        </form>
        {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        <div className="mt-4 text-sm">
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/verify-email">Need a new verification email?</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
