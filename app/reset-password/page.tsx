"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  });
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);


  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setStatus("Password reset successful. You can now sign in.");
        return;
      }
      setStatus(await parseError(res, `Reset failed (${res.status})`));
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
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">One-Time Token</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">Secure Reset Flow</h3>
          <p className="mt-2 text-sm text-muted-foreground">Reset tokens expire quickly and are invalid after first use to protect active studio projects.</p>
        </div>
      }
    >
      <Panel title="Reset Password" subtitle="Set a new password to continue your fotoz.io workflow.">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
          <Input type="password" placeholder="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
        </form>
        {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        <div className="mt-4 text-sm">
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/login">Back to sign in</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
