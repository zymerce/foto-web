"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, SectionCard } from "@/components/ui/primitives";
import { apiBaseUrl, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

export function SupportEscalationConsole({ shellMode = "platform" }: { shellMode?: "platform" | "studio" }) {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [actionType, setActionType] = useState("verify_email");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("medium");
  const [targetUserId, setTargetUserId] = useState("");
  const [status, setStatus] = useState("");
  const [list, setList] = useState<{ id: string; action_type: string; priority: string; status: string; reason: string }[]>([]);
  useEffect(() => {
    if (!user || (!hasRole(user, "support") && !hasRole(user, "admin") && !hasRole(user, "super_admin"))) return;
    const endpoint = hasRole(user, "support") && !hasRole(user, "admin") && !hasRole(user, "super_admin")
      ? "/auth/support/escalations"
      : "/auth/admin/escalations";
    const run = async () => {
      const token = await ensureAccessToken(baseUrl);
      if (!token) return;
      fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.ok ? res.json() : null)
        .then((body) => {
          if (body?.items) setList(body.items);
        })
        .catch(() => {});
    };
    void run();
  }, [baseUrl, user]);

  async function createEscalation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setStatus("Session expired. Please sign in again.");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/support/escalations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action_type: actionType,
        reason,
        priority,
        target_user_id: targetUserId || undefined,
      }),
    });
    if (!res.ok) {
      setStatus(await parseError(res, `Escalation failed (${res.status})`));
      return;
    }
    setStatus("Escalation submitted to admin inbox.");
    setReason("");
    setTargetUserId("");
  }

  if (state === "loading") return <main className="p-6">Loading support console...</main>;
  if (state === "unauthorized") {
    return (
      <main className="p-6">
        <EmptyState title="Session required" detail="Please sign in to access support operations." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user) return <main className="p-6"><ErrorState detail="Support session unavailable." /></main>;
  if (!hasRole(user, "support") && !hasRole(user, "admin") && !hasRole(user, "super_admin")) return <main className="p-6"><ErrorState detail="Support access required." /></main>;
  const currentUser = user;

  return (
    <AppShell
      roles={currentUser.roles}
      permissions={currentUser.permissions}
      isSuperAdmin={currentUser.is_super_admin}
      accountType={currentUser.account_type}
      userLabel={currentUser.username || currentUser.email || "Support"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={currentUser.studio?.name || currentUser.workspace?.name}
      shellMode={shellMode}
    >
      <div className="space-y-6">
        <PageHeader eyebrow="Support" title="Escalation Control" subtitle="Investigate safely, then route risky changes through audited escalation requests." />
        <SectionCard title="Request Admin Action" subtitle="Submit a tracked escalation with target user and reason">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={createEscalation}>
            <Input placeholder="Action type (verify_email/disable_user/...)" value={actionType} onChange={(e) => setActionType(e.target.value)} required />
            <Input placeholder="Priority (low/medium/high)" value={priority} onChange={(e) => setPriority(e.target.value)} required />
            <Input placeholder="Target user id (optional)" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <Button className="sm:col-span-2">Submit escalation</Button>
          </form>
          {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        </SectionCard>

        <SectionCard title="Escalation Timeline" subtitle="Current escalation state from admin inbox">
          <div className="space-y-2">
            {list.length === 0 ? <p className="text-sm text-muted-foreground">No escalations yet.</p> : null}
            {list.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold">{item.action_type} · {item.priority} · {item.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
