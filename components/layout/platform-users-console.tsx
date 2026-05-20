"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole, type MeUser } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type PlatformUser = {
  id: string;
  email: string | null;
  username: string | null;
  status: string;
  account_type: string;
  email_verified: boolean;
  roles: string[];
  scope?: string;
  platform_role?: string | null;
  studio_role?: string | null;
  integrity_flags?: string[];
  studio?: { id: string; name: string; slug: string; membership_role: string } | null;
};

type UserDiagnostics = {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    status: string;
    roles: string[];
    scope: string;
    studio?: { id: string; name: string; slug: string; membership_role: string } | null;
  };
  active_sessions: number;
  project_access: { id: string; name: string; status: string }[];
  helper_devices: { id: string; project_id: string | null; device_label: string; last_seen_at: string | null; expires_at: string; revoked_at: string | null }[];
};

export function PlatformUsersConsole({ supportMode = false }: { supportMode?: boolean }) {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlatformUser[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, UserDiagnostics>>({});
  const [activeDiagnosticUserId, setActiveDiagnosticUserId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const listUrl = useMemo(() => {
    const search = query.trim();
    return search ? `${baseUrl}/auth/platform/users?query=${encodeURIComponent(search)}` : `${baseUrl}/auth/platform/users`;
  }, [baseUrl, query]);

  useEffect(() => {
    if (!user || !(hasRole(user, "super_admin") || hasRole(user, "support"))) return;
    const run = async () => {
      setPageState("loading");
      const token = await ensureAccessToken(baseUrl);
      if (!token) {
        setPageState("error");
        setFeedback("Session expired. Please sign in again.");
        return;
      }
      try {
        const response = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setPageState("error");
          setFeedback(await parseError(response, `User lookup failed (${response.status})`));
          return;
        }
        const body = (await response.json()) as { items: PlatformUser[] };
        setItems(body.items);
        setPageState("ready");
      } catch {
        setPageState("error");
        setFeedback(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [baseUrl, listUrl, user]);

  async function runSupportAction(userId: string, action: "resend-verification" | "resend-reset" | "verify-email" | "revoke-sessions") {
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/support/users/${userId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await parseError(response, `Support action failed (${response.status})`);
        setFeedback(message);
        toast.error("Support action failed", { description: message });
        return;
      }
      const label = action.replaceAll("-", " ");
      toast.success("Support action completed", { description: `Successfully ran ${label}.` });
      setFeedback(`Completed ${label}.`);
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function resendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/support/invites/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Invite resend failed (${response.status})`);
        setFeedback(message);
        toast.error("Invite resend failed", { description: message });
        return;
      }
      setInviteEmail("");
      setFeedback("Invite resent successfully.");
      toast.success("Invite resent", { description: "A fresh invite has been issued." });
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function loadDiagnostics(userId: string) {
    setFeedback("");
    setActiveDiagnosticUserId(userId);
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      setActiveDiagnosticUserId(null);
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/users/${userId}/diagnostics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await parseError(response, `Diagnostics failed (${response.status})`);
        setFeedback(message);
        toast.error("Diagnostics failed", { description: message });
        return;
      }
      const body = (await response.json()) as UserDiagnostics & { status: string };
      setDiagnostics((current) => ({ ...current, [userId]: body }));
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    } finally {
      setActiveDiagnosticUserId(null);
    }
  }

  async function startViewAs(userId: string) {
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/view-as`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_user_id: userId }),
      });
      if (!response.ok) {
        const message = await parseError(response, `View-as failed (${response.status})`);
        setFeedback(message);
        toast.error("View-as failed", { description: message });
        return;
      }
      const body = (await response.json()) as { access_token: string; user: MeUser };
      const { storeAccessToken, writeCachedUser } = await import("@/lib/session");
      storeAccessToken(body.access_token);
      writeCachedUser(body.user);
      toast.success("Read-only view-as started", { description: "You are now browsing as the selected studio user." });
      window.location.href = "/app/home";
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  if (state === "loading") return <main className="p-6">Loading platform...</main>;
  if (state === "unauthorized") return <main className="p-6"><EmptyState title="Session required" detail="Please sign in to access platform users." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} /></main>;
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user || !(hasRole(user, "super_admin") || hasRole(user, "support"))) return <main className="p-6"><ErrorState detail="Platform user access required." /></main>;

  return (
    <AppShell
      roles={user.roles}
      permissions={user.permissions}
      isSuperAdmin={user.is_super_admin}
      accountType={user.account_type}
      userLabel={user.username || user.email || "Platform"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      shellMode="platform"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={supportMode ? "Support Users" : "Users"}
          title={supportMode ? "User Recovery and Lookup" : "Platform Users"}
          subtitle={supportMode ? "Inspect accounts safely and run bounded recovery actions." : "Readable cross-studio account visibility for support and founder operations."}
        />

        <SectionCard title="Search Users" subtitle="Find users by email or username">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by email or username" />
        </SectionCard>

        {supportMode ? (
          <SectionCard title="Resend Invite" subtitle="Issue a fresh invite for a known email address">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={resendInvite}>
              <Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="invited-user@studio.com" required />
              <Button type="submit" disabled={!inviteEmail.trim()}>Resend Invite</Button>
            </form>
          </SectionCard>
        ) : null}

        {pageState === "loading" ? <LoadingSkeleton lines={6} /> : null}
        {pageState === "error" ? <ErrorState detail={feedback || "Unable to load users."} /> : null}
        {pageState === "ready" ? (
          <SectionCard title={supportMode ? "Support recovery list" : "User directory"} subtitle={supportMode ? "Apply support-safe actions without crossing governance boundaries." : "Current platform-visible user list."}>
            <div className="space-y-3">
              {items.length === 0 ? <EmptyState title="No users found" detail="Try a broader search to continue." /> : null}
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm font-semibold">{item.email || item.username || item.id}</p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-primary">
                          {item.platform_role || item.studio_role || item.roles[0] || "member"}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.scope || "studio"} scope
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.account_type}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.status}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.email_verified ? "verified" : "needs verification"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.studio?.name ? `Studio: ${item.studio.name}` : "No linked studio"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => loadDiagnostics(item.id)} disabled={activeDiagnosticUserId === item.id}>
                        {activeDiagnosticUserId === item.id ? "Loading diagnostics..." : "Diagnostics"}
                      </Button>
                      {supportMode ? (
                        <>
                          <Button variant="outline" onClick={() => runSupportAction(item.id, "resend-verification")}>Resend verification</Button>
                          <Button variant="outline" onClick={() => runSupportAction(item.id, "resend-reset")}>Resend reset</Button>
                          <Button variant="outline" onClick={() => runSupportAction(item.id, "verify-email")}>Mark email verified</Button>
                          <Button variant="outline" onClick={() => runSupportAction(item.id, "revoke-sessions")}>Revoke sessions</Button>
                        </>
                      ) : hasRole(user, "super_admin") && item.scope === "studio" ? (
                        <Button variant="outline" onClick={() => startViewAs(item.id)}>
                          View as read-only
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {item.integrity_flags?.length ? <p className="mt-2 text-xs text-destructive">Integrity flags: {item.integrity_flags.join(", ")}</p> : null}
                  {diagnostics[item.id] ? (
                    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-sm font-semibold">Diagnostics</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border bg-background px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Sessions</p>
                          <p className="mt-1 text-sm font-semibold">{diagnostics[item.id].active_sessions}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-background px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Projects</p>
                          <p className="mt-1 text-sm font-semibold">{diagnostics[item.id].project_access.length}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-background px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Helper devices</p>
                          <p className="mt-1 text-sm font-semibold">{diagnostics[item.id].helper_devices.length}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Project access</p>
                          <div className="mt-2 space-y-2">
                            {diagnostics[item.id].project_access.length === 0 ? <p className="text-xs text-muted-foreground">No project access linked.</p> : null}
                            {diagnostics[item.id].project_access.slice(0, 3).map((project) => (
                              <p key={project.id} className="text-xs text-muted-foreground">{project.name} · {project.status}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Helper devices</p>
                          <div className="mt-2 space-y-2">
                            {diagnostics[item.id].helper_devices.length === 0 ? <p className="text-xs text-muted-foreground">No Helper devices linked.</p> : null}
                            {diagnostics[item.id].helper_devices.slice(0, 2).map((device) => (
                              <p key={device.id} className="text-xs text-muted-foreground">{device.device_label} · last seen {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "never"}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </div>
    </AppShell>
  );
}
