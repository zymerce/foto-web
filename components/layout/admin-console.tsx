"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, EmptyState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole, isPlatformUser, readCachedUser, type MeUser, writeCachedUser } from "@/lib/session";

/* ─── Resource state ─────────────────────────────────────────── */

type ResourcePhase = "idle" | "loading" | "ready" | "error"; // eslint-disable-line @typescript-eslint/no-unused-vars

type Resource<T> =
  | { phase: "idle" | "loading" }
  | { phase: "ready"; data: T }
  | { phase: "error"; error: string };

type AdminDataMap = {
  pending: Resource<{ pending_invites: number; pending_verifications: number; pending_password_resets: number }>;
  users:    Resource<{ items: User[] }>;
  config:   Resource<SystemConfig>;
  escalations: Resource<{ items: Escalation[] }>;
  audit:    Resource<{ items: AuditItem[] }>;
  policies: Resource<PolicySnapshot>;
};

function resReady<T>(data: T): Resource<T>   { return { phase: "ready", data }; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resError<T>(error: string): Resource<T> { return { phase: "error", error }; }
function resLoading<T>(): Resource<T>          { return { phase: "loading" }; }

type Pending = { pending_invites: number; pending_verifications: number; pending_password_resets: number };
type User = { id: string; email: string | null; username: string | null; status: string; account_type: string; email_verified: boolean; roles: string[]; scope?: string; studio_role?: string | null };
type PolicyLock = { managed_by: "super_admin"; reason: string };
type SystemConfig = {
  email_verification_mode: "admin" | "self" | "none";
  allow_open_signup: boolean;
  helper_upload_enabled: boolean;
  policy_lock: PolicyLock;
  write_allowed: boolean;
};
type Escalation = {
  id: string;
  requested_by_user_id: string;
  target_user_id: string | null;
  action_type: string;
  reason: string;
  priority: string;
  status: string;
  resolution_note: string | null;
  created_at: string;
};
type AuditItem = {
  id: string;
  actor_user_id: string;
  action: string;
  target: string | null;
  reason: string | null;
  timestamp: string;
};
type PolicySnapshot = {
  allow_open_signup: boolean;
  email_verification_mode: "admin" | "self" | "none";
  helper_upload_enabled: boolean;
  policy_lock?: PolicyLock;
};

const SECTION_LABEL: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Admin Overview", subtitle: "Live operational health and fast actions." },
  users: { title: "Studio Team", subtitle: "Manage studio members and linked clients within this studio only." },
  invites: { title: "Invites", subtitle: "Create and monitor invite onboarding." },
  verification: { title: "Verification", subtitle: "Control verification policy and pending approvals." },
  policies: { title: "Policies", subtitle: "Signup, verification, session and helper behavior policy." },
  security: { title: "Security", subtitle: "Sensitive actions and emergency controls." },
  audit: { title: "Audit Stream", subtitle: "Immutable record of sensitive operations." },
  release: { title: "Release Control", subtitle: "Promotion discipline and runbook references." },
  super: { title: "Super Admin", subtitle: "Global owner controls with typed confirmations." },
};

export function AdminConsole({
  section,
  shellMode = "studio",
}: {
  section: keyof typeof SECTION_LABEL;
  shellMode?: "studio" | "platform";
}) {
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "forbidden" | "error">("loading");
  const [detail, setDetail] = useState("");
  const [user, setUser] = useState<MeUser | null>(() => readCachedUser());
  const [resources, setResources] = useState<AdminDataMap>({
    pending:     resLoading(),
    users:       resLoading(),
    config:      resLoading(),
    escalations: resLoading(),
    audit:       resLoading(),
    policies:    resLoading(),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("photographer");
  const [inviteType, setInviteType] = useState("studio");
  const [resolveNote, setResolveNote] = useState("");
  const [policyReason, setPolicyReason] = useState("");
  const [superAdminReason, setSuperAdminReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [superTargetUserId, setSuperTargetUserId] = useState("");
  const [superRoleKey, setSuperRoleKey] = useState("admin");

  const baseUrl = apiBaseUrl();
  const activeLabel = SECTION_LABEL[section];
  const isSuperAdmin = !!user?.is_super_admin;

  const canAccess = useMemo(() => {
    if (!user) return false;
    return shellMode === "platform" ? hasRole(user, "super_admin") : hasRole(user, "admin") && !isPlatformUser(user);
  }, [user]);

  /* ─── Typed single-resource fetcher ─────────────────────────── */

  async function fetchResource<T>(
    controller: AbortController,
    token: string,
    url: string,
    parse: (body: unknown) => T,
  ): Promise<Resource<T>> {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return { phase: "error", error: `HTTP ${response.status}` };
      }
      const body = (await response.json()) as unknown;
      return { phase: "ready", data: parse(body) };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { phase: "idle" };
      return { phase: "error", error: (err as Error).message ?? "Unknown error" };
    }
  }

  /* ─── Aggregate all per-resource phases into one display state ─ */

  type AggregateState =
    | { phase: "loading" }
    | { phase: "ready"; degraded: readonly string[]; degradedCount: number }
    | { phase: "all-error"; summary: string };

  function aggregate(resources: readonly (Resource<unknown> | undefined)[]): AggregateState {
    const defined    = resources.filter((r): r is Resource<unknown> => r !== undefined);
    const loading    = defined.filter((r) => r.phase === "loading");
    const errors     = defined.filter((r) => r.phase === "error") as Extract<Resource<unknown>, { phase: "error" }>[];
    if (loading.length > 0)                              return { phase: "loading" };
    if (errors.length > 0 && errors.length === defined.length) {
      return { phase: "all-error", summary: "Nothing could be loaded from the API." };
    }
    return { phase: "ready", degraded: errors.map((e) => e.error), degradedCount: errors.length };
  }

  /* ─── Load: cancelable, typed, returns aggregate state ─────── */

  const load = useCallback(async (ctrl?: AbortController, ty?: string) => {
    const controller = ctrl ?? new AbortController();
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return { phase: "error" as const, summary: "Session expired." };
    }
    let meRes: Response;
    try {
      meRes = await fetch(`${baseUrl}/auth/me`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setState("error");
      setDetail(apiNetworkErrorMessage(baseUrl));
      return { phase: "error" as const, summary: apiNetworkErrorMessage(baseUrl) };
    }
    if (!meRes.ok) {
      setState("unauthorized");
      return { phase: "error" as const, summary: "Not authenticated." };
    }
    const meBody     = (await meRes.json()) as { user: MeUser };
    const meUser     = meBody.user;
    setUser(meUser);
    writeCachedUser(meUser);
    if (shellMode === "platform" ? !hasRole(meUser, "super_admin") : !(hasRole(meUser, "admin") && !isPlatformUser(meUser))) {
      setState("forbidden");
      return { phase: "error" as const, summary: "Access forbidden." };
    }

    const requests: Array<{ key: keyof AdminDataMap; url: string }> = [
      { key: "pending",     url: `${baseUrl}/auth/admin/security/pending` },
      { key: "users",       url: `${baseUrl}/auth/admin/users` },
      { key: "config",      url: `${baseUrl}/auth/admin/system-config` },
      { key: "escalations", url: `${baseUrl}/auth/admin/escalations` },
      { key: "audit",       url: `${baseUrl}/auth/admin/audit` },
    ];
    if (meUser.is_super_admin) {
      requests.push({ key: "policies", url: `${baseUrl}/auth/super-admin/policies` });
    }

    const resultMap: Record<string, Resource<unknown>> = {};

    const settled = await Promise.allSettled(
      requests.map(({ url }) =>
        fetch(url, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }),
      ),
    );

    for (let i = 0; i < settled.length; i++) {
      const key  = requests[i].key;
      const slot = resultMap[key] ?? resLoading();

      const result = settled[i];
      if (result.status !== "fulfilled") {
        resultMap[key] = { ...slot, phase: "error" as const, error: "Request rejected or failed." };
        continue;
      }
      const response = result.value;
      if (!response.ok) {
        resultMap[key] = { ...slot, phase: "error" as const, error: `HTTP ${response.status}` };
        continue;
      }

      switch (key) {
        case "pending":
          resultMap.pending = resReady((await response.json()) as Pending);
          break;
        case "users": {
          const items = ((await response.json()) as { items: User[] }).items;
          resultMap.users = resReady({ items });
          break;
        }
        case "config":
          resultMap.config = resReady((await response.json()) as SystemConfig);
          break;
        case "escalations": {
          const items = ((await response.json()) as { items: Escalation[] }).items;
          resultMap.escalations = resReady({ items });
          break;
        }
        case "audit": {
          const items = ((await response.json()) as { items: AuditItem[] }).items;
          resultMap.audit = resReady({ items });
          break;
        }
        case "policies":
          resultMap.policies = resReady((await response.json()) as PolicySnapshot);
          break;
      }
    }

    setResources(resultMap as AdminDataMap);
    const agg = aggregate(Object.values(resultMap));
    if (agg.phase === "all-error") {
      setDetail(agg.summary);
    } else if (agg.phase === "ready" && agg.degradedCount > 0) {
      setDetail(`Partially loaded — ${agg.degradedCount} endpoint(s) failed: ${agg.degraded.join(", ")}`);
    } else {
      setDetail("");
    }
    setState("ready");
    return agg;
  }, [baseUrl, shellMode]);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      void load(ctrl);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [load]);

  /* ─── Aggregation helpers ──────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function readyOrError<T>(r: Resource<T>): r is Resource<T> & { phase: "ready" | "error" } {
    return r.phase === "ready" || r.phase === "error";
  }

  /* ─── Aggregate banner ───────────────────────────────────────── */

  /* Pre-compute banner outside of JSX so AggregatePhaseBanner can live
     outside the component body and satisfy react/no-unstable-nested-components. */
  const _aggregateResult = useMemo(() => aggregate([
    resources.pending, resources.users, resources.config,
    resources.escalations, resources.audit, resources.policies,
  ]  ), [resources]);

  /* Pre-computed banner JSX derived from _aggregateResult, avoids
     declaring a component inside the render loop. */
  const _aggregateBanner = (() => {
    const agg = _aggregateResult;
    if (agg.phase === "loading") return <p className="text-xs text-muted-foreground" aria-live="polite">Loading admin data…</p>;
    if (agg.phase === "all-error")  return <p className="text-xs text-destructive" aria-live="polite">{agg.summary}</p>;
    if (agg.phase === "ready" && agg.degradedCount > 0) return <p className="text-xs text-amber-600 dark:text-amber-400" aria-live="polite">{agg.degradedCount} endpoint{agg.degradedCount !== 1 ? "s" : ""} degraded — showing partial data.&ensp;Details: {agg.degraded.join(" · ")}</p>;
    return <p className="text-xs text-muted-foreground" aria-live="polite">All systems loaded.</p>;
  })();

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, intended_role: inviteRole, account_type: inviteType, ttl_hours: 48 }),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Invite failed (${res.status})`));
      return;
    }
    setDetail("Invite created successfully.");
    setInviteEmail("");
    void load();
  }

  async function updateStatus(userId: string, statusValue: "active" | "disabled") {
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/admin/users/${userId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status_value: statusValue }),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Status update failed (${res.status})`));
      return;
    }
    setDetail(`User ${statusValue}.`);
    void load();
  }

  async function verifyEmail(userId: string) {
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/admin/users/${userId}/verify-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Verify email failed (${res.status})`));
      return;
    }
    setDetail("User email marked verified.");
    void load();
  }

  async function resolveEscalation(escalationId: string, statusValue: "resolved" | "rejected") {
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const note = resolveNote.trim();
    if (!note) {
      setDetail("Resolution note is required.");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/admin/escalations/${escalationId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: statusValue, resolution_note: note }),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Escalation update failed (${res.status})`));
      return;
    }
    setResolveNote("");
    setDetail(`Escalation ${statusValue}.`);
    void load();
  }

  async function savePolicies(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const policiesData = resources.policies;
    if (!isSuperAdmin || policiesData.phase !== "ready") return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const reason = policyReason.trim();
    if (!reason) {
      setDetail("Policy change reason is required.");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/super-admin/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...policiesData.data, reason }),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Policy save failed (${res.status})`));
      return;
    }
    setDetail("Policies updated.");
    setPolicyReason("");
    void load();
  }

  async function runEmergency(action: "disable-signup" | "force-email-verification" | "revoke-sessions", expectedText: string) {
    if (!isSuperAdmin) return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    if (confirmText !== expectedText) {
      setDetail(`Type ${expectedText} to confirm.`);
      return;
    }
    if (!superAdminReason.trim()) {
      setDetail("Emergency reason is required.");
      return;
    }
    const endpoint =
      action === "disable-signup"
        ? "/auth/super-admin/emergency/disable-signup"
        : action === "force-email-verification"
          ? "/auth/super-admin/emergency/force-email-verification"
          : "/auth/super-admin/emergency/revoke-sessions";
    const payload =
      action === "revoke-sessions"
        ? { scope: "all", reason: superAdminReason, confirm_text: expectedText }
        : { reason: superAdminReason, confirm_text: expectedText };
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Emergency action failed (${res.status})`));
      return;
    }
    setDetail("Emergency action completed.");
    setConfirmText("");
    setSuperAdminReason("");
    void load();
  }

  async function updateAdminRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin) return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    if (!superTargetUserId.trim() || !superAdminReason.trim()) {
      setDetail("Target user and reason are required.");
      return;
    }
    const res = await fetch(`${baseUrl}/auth/super-admin/admins/${superTargetUserId.trim()}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role_key: superRoleKey, enabled: true, reason: superAdminReason }),
    });
    if (!res.ok) {
      setDetail(await parseError(res, `Role update failed (${res.status})`));
      return;
    }
    setDetail("Role elevated successfully.");
    setSuperTargetUserId("");
    setSuperAdminReason("");
    void load();
  }

  /* ─── Per-section renderers ────────────────────────────────── */

  // Each section renderer holds its own local variable block so TS can
  // narrow the Resource<X> union through sequential if/return checks.

  function renderOverview(): ReactNode {
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Pending Invites"
            value={resources.pending.phase === "ready"
              ? resources.pending.data.pending_invites
              : resources.pending.phase === "error"
                ? <span aria-label="Failed to load">—</span>
                : 0}
          />
          <StatTile
            label="Pending Verifications"
            value={resources.pending.phase === "ready"
              ? resources.pending.data.pending_verifications
              : resources.pending.phase === "error"
                ? <span aria-label="Failed to load">—</span>
                : 0}
          />
          <StatTile
            label="Pending Resets"
            value={resources.pending.phase === "ready"
              ? resources.pending.data.pending_password_resets
              : resources.pending.phase === "error"
                ? <span aria-label="Failed to load">—</span>
                : 0}
          />
          <StatTile
            label="Open Escalations"
            value={
              resources.escalations.phase === "ready"
                ? resources.escalations.data.items.filter((item) => item.status === "open").length
                : resources.escalations.phase === "error"
                  ? <span aria-label="Failed to load">—</span>
                  : <span aria-label="Loading">…</span>
            }
          />
          <StatTile
            label="Disabled Users"
            value={
              resources.users.phase === "ready"
                ? resources.users.data.items.filter((item) => item.status === "disabled").length
                : resources.users.phase === "error"
                  ? <span aria-label="Failed to load">—</span>
                  : <span aria-label="Loading">…</span>
            }
          />
        </div>
      </>
    );
  }

  function renderUsers(): ReactNode {
    if (resources.users.phase === "loading") {
      return <div className="space-y-3"><LoadingSkeleton lines={3} /></div>;
    }
    if (resources.users.phase === "error") {
      return <ErrorState detail={resources.users.error} />;
    }
    const users = (resources.users as { phase: "ready"; data: { items: User[] } }).data.items;
    if (users.length === 0) {
      return <EmptyState title="No team members found" detail="Invite someone to get started." />;
    }
    return (
      <div className="space-y-3">
        {users.map((u: User) => (
          <div key={u.id} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-semibold">{u.email || u.username || u.id}</p>
            <p className="mt-1 text-xs text-muted-foreground">{u.studio_role || u.roles.join(", ")} · {u.account_type} · {u.status} · verified: {String(u.email_verified)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => verifyEmail(u.id)}>Verify Email</Button>
              <Button variant="outline" onClick={() => updateStatus(u.id, "active")}>Activate</Button>
              <Button variant="outline" onClick={() => updateStatus(u.id, "disabled")} disabled={u.id === user?.id}>Disable</Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderVerification(): ReactNode {
    if (resources.config.phase === "loading") {
      return <div className="space-y-2"><LoadingSkeleton lines={3} /></div>;
    }
    if (resources.config.phase === "error") {
      return <ErrorState detail={resources.config.error} />;
    }
    // At this point TS can be told the phase is "ready" via a cast:
    const c = (resources.config as { phase: "ready"; data: SystemConfig }).data;
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Current mode: <span className="font-semibold text-foreground">{c.email_verification_mode}</span></p>
        <p>Managed by: <span className="font-semibold text-foreground">{c.policy_lock.managed_by ?? "super_admin"}</span></p>
        <p>{c.policy_lock.reason || "Managed by Super Admin governance policy."}</p>
        <p className="text-xs">Admin scope is read-only for verification policy. Use Super Admin `Policies` for governance writes.</p>
      </div>
    );
  }

  function renderPolicies(): ReactNode {
    if (!isSuperAdmin) {
      return (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Managed by Super Admin</p>
          <p>allow_open_signup: <span className="font-medium text-foreground">{resources.config.phase === "ready" ? String(resources.config.data.allow_open_signup) : "—"}</span></p>
          <p>email_verification_mode: <span className="font-medium text-foreground">{resources.config.phase === "ready" ? resources.config.data.email_verification_mode : "—"}</span></p>
          <p>helper_upload_enabled: <span className="font-medium text-foreground">{resources.config.phase === "ready" ? String(resources.config.data.helper_upload_enabled) : "—"}</span></p>
          <p>{resources.config.phase === "ready" ? resources.config.data.policy_lock.reason || "Governance settings are controlled by super admins only." : "Managed by Super Admin governance policy."}</p>
        </div>
      );
    }
    if (resources.policies.phase === "loading" || resources.policies.phase === "idle") {
      return <p className="text-sm text-muted-foreground" aria-live="polite">Loading policy snapshot…</p>;
    }
    if (resources.policies.phase === "error") {
      return <ErrorState detail={resources.policies.error} />;
    }
    // Ready:
    const pd = (resources.policies as { phase: "ready"; data: PolicySnapshot }).data;
    return (
      <form className="space-y-3" onSubmit={savePolicies}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pd.allow_open_signup} onChange={(e) => setResources((prev) => prev.policies.phase === "ready" ? { ...prev, policies: { ...prev.policies, data: { ...prev.policies.data, allow_open_signup: e.target.checked } } } as AdminDataMap : prev)} />
          Allow open signup
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pd.helper_upload_enabled} onChange={(e) => setResources((prev) => prev.policies.phase === "ready" ? { ...prev, policies: { ...prev.policies, data: { ...prev.policies.data, helper_upload_enabled: e.target.checked } } } as AdminDataMap : prev)} />
          Enable helper uploads
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setResources((prev) => prev.policies.phase === "ready" ? { ...prev, policies: { ...prev.policies, data: { ...prev.policies.data, email_verification_mode: "admin" } } } as AdminDataMap : prev)}>Admin verify</Button>
          <Button type="button" variant="outline" onClick={() => setResources((prev) => prev.policies.phase === "ready" ? { ...prev, policies: { ...prev.policies, data: { ...prev.policies.data, email_verification_mode: "self" } } } as AdminDataMap : prev)}>Self verify</Button>
          <Button type="button" variant="outline" onClick={() => setResources((prev) => prev.policies.phase === "ready" ? { ...prev, policies: { ...prev.policies, data: { ...prev.policies.data, email_verification_mode: "none" } } } as AdminDataMap : prev)}>No verify</Button>
        </div>
        <Input placeholder="Reason for policy update" value={policyReason} onChange={(e) => setPolicyReason(e.target.value)} required />
        <Button>Save policies</Button>
      </form>
    );
  }

  function renderSecurity(): ReactNode {
    if (resources.escalations.phase === "loading") {
      return <div className="space-y-3"><LoadingSkeleton lines={3} /></div>;
    }
    if (resources.escalations.phase === "error") {
      return <ErrorState detail={resources.escalations.error} />;
    }
    const items = (resources.escalations as { phase: "ready"; data: { items: Escalation[] } }).data.items;
    return (
      <div className="space-y-3">
        {items.length === 0
          ? <EmptyState title="No open escalations" detail="The queue is empty." />
          : items.map((item: Escalation) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-semibold">{item.action_type} · {item.priority} · {item.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                {item.status === "open" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input placeholder="Resolution note" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
                    <Button variant="outline" onClick={() => resolveEscalation(item.id, "resolved")}>Resolve</Button>
                    <Button variant="outline" onClick={() => resolveEscalation(item.id, "rejected")}>Reject</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Resolution: {item.resolution_note || "n/a"}</p>
                )}
              </div>
            ))}
      </div>
    );
  }

  function renderAudit(): ReactNode {
    if (resources.audit.phase === "loading") {
      return <div className="space-y-3"><LoadingSkeleton lines={3} /></div>;
    }
    if (resources.audit.phase === "error") {
      return <ErrorState detail={resources.audit.error} />;
    }
    const auditItems = (resources.audit as { phase: "ready"; data: { items: AuditItem[] } }).data.items;
    return (
      <div className="space-y-3">
        {auditItems.map((item: AuditItem) => (
          <div key={item.id} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-semibold">{item.action}</p>
            <p className="text-xs text-muted-foreground">{item.timestamp} · actor {item.actor_user_id}</p>
            {item.reason ? <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p> : null}
          </div>
        ))}
      </div>
    );
  }

  const bySection: Record<keyof typeof SECTION_LABEL, ReactNode> = {
    overview: renderOverview(),
    users: (
      <SectionCard title="Studio Team" subtitle="Only members and linked clients from the active studio appear here.">
        {renderUsers()}
      </SectionCard>
    ),
    invites: (
      <SectionCard title="Create Invite" subtitle="Studio-scoped invites are limited to photographers and clients.">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={createInvite}>
          <Input type="email" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          <Input placeholder="Role (photographer/customer)" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} required />
          <Input placeholder="Account type (studio/client)" value={inviteType} onChange={(e) => setInviteType(e.target.value)} required />
          <Button>Create Invite</Button>
        </form>
      </SectionCard>
    ),
    verification: (
      <SectionCard title="Verification Mode" subtitle="Control verification policy and pending approvals.">
        {renderVerification()}
      </SectionCard>
    ),
    policies: (
      <SectionCard title="Global Policies" subtitle="Signup, verification, session and helper behavior policy.">
        {renderPolicies()}
      </SectionCard>
    ),
    security: (
      <SectionCard title="Escalation Inbox" subtitle="Review and resolve support escalation requests">
        {renderSecurity()}
      </SectionCard>
    ),
    audit: (
      <SectionCard title="Audit Stream" subtitle="Immutable record of sensitive operations.">
        {renderAudit()}
      </SectionCard>
    ),
    release: (
      <SectionCard title="Release Operations" subtitle="Promotion discipline and runbook references.">
        <p className="text-sm text-muted-foreground">{"Follow strict promotion path: feature branches -> qa -> main. Ensure release note, rollback plan, and docs are updated before qa -> main promotion."}</p>
      </SectionCard>
    ),
    super: (
      <div className="space-y-6">
        <SectionCard title="Super Admin Role Management" subtitle="Promote target users to admin/super-admin with explicit reason">
          {!isSuperAdmin ? (
            <ErrorState detail="Super-admin role required." />
          ) : (
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={updateAdminRole}>
              <Input placeholder="Target user id" value={superTargetUserId} onChange={(e) => setSuperTargetUserId(e.target.value)} required />
              <Input placeholder="Role key (admin/super_admin)" value={superRoleKey} onChange={(e) => setSuperRoleKey(e.target.value)} required />
              <Input placeholder="Reason" value={superAdminReason} onChange={(e) => setSuperAdminReason(e.target.value)} required />
              <Button>Promote role</Button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Emergency Controls" subtitle="High-risk operations require typed confirmation and reason">
          {!isSuperAdmin ? (
            <ErrorState detail="Super-admin role required." />
          ) : (
            <div className="space-y-3">
              <Input placeholder="Reason for emergency action" value={superAdminReason} onChange={(e) => setSuperAdminReason(e.target.value)} />
              <Input placeholder="Typed confirmation text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => runEmergency("disable-signup", "DISABLE SIGNUP")}>Disable signup</Button>
                <Button variant="outline" onClick={() => runEmergency("force-email-verification", "FORCE VERIFICATION")}>Force verification</Button>
                <Button variant="outline" onClick={() => runEmergency("revoke-sessions", "REVOKE SESSIONS")}>Revoke all sessions</Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    ),
  };

  let sectionContent: ReactNode;
  if (state === "loading") {
    sectionContent = (
      <SectionCard title="Loading" subtitle="Preparing admin controls">
        <p className="text-sm text-muted-foreground">Loading admin console...</p>
      </SectionCard>
    );
  } else if (state === "unauthorized") {
    sectionContent = <ErrorState detail={`Not authenticated for ${shellMode === "platform" ? "platform" : "studio"} administration.`} />;
  } else if (state === "forbidden") {
    sectionContent = <ErrorState detail="Forbidden: admin or super-admin access required." />;
  } else if (state === "error" || !canAccess) {
    sectionContent = <ErrorState detail={detail || "Unable to load admin console."} />;
  } else {
    sectionContent = bySection[section];
  }

  return (
    <AppShell
      roles={user?.roles || ["admin"]}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type || "platform"}
      userLabel={user?.username || user?.email || "Admin"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={user?.studio?.name || user?.workspace?.name}
      shellMode={shellMode}
    >
      <div className="space-y-6">
        <PageHeader eyebrow="Operations" title={activeLabel.title} subtitle={activeLabel.subtitle} />
        {sectionContent}
        {_aggregateBanner}
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      </div>
    </AppShell>
  );
}
