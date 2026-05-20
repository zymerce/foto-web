"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

export default function InviteAcceptPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);


  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/auth/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password }),
      });
      if (res.ok) {
        setStatus("Invite accepted. You can now sign in to fotoz.io.");
        return;
      }
      setStatus(await parseError(res, `Invite acceptance failed (${res.status})`));
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
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Invited Access</p>
          <h3 className="mt-2 text-xl font-semibold sm:text-2xl">Join team workflow securely</h3>
          <p className="mt-2 text-sm text-muted-foreground">Invite links are single-use and role-scoped to keep studio operations controlled and auditable.</p>
        </div>
      }
    >
      <Panel title="Accept Invite" subtitle="Join the invited fotoz.io project workflow.">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Invite token" value={token} onChange={(e) => setToken(e.target.value)} required />
          <Input placeholder="Username (optional)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
        </form>
        {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        <div className="mt-4 text-sm">
          <Link className="underline decoration-border underline-offset-4 hover:text-foreground" href="/login">Already activated? Sign in</Link>
        </div>
      </Panel>
    </AuthPageShell>
  );
}
