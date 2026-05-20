"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type StudioSummary = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  owner_email: string | null;
  owner_username: string | null;
  member_count: number;
  project_count: number;
  plan_key?: string;
  subscription_status?: string | null;
  is_manual_override?: boolean;
  created_at: string;
};

type StudioDetail = {
  studio: StudioSummary;
  usage?: {
    plan_key: string;
    subscription_status: string;
    projects_used: number;
    projects_limit: number | null;
    storage_used_gb: number;
    storage_limit_gb: number | null;
    active_upload_sessions: number;
    active_browser_sessions: number;
    manual_override: { enabled: boolean; note: string | null; expires_at: string | null };
  };
  members: { id: string; email: string | null; username: string | null; account_type: string; roles: string[] }[];
  projects: { id: string; name: string; status: string; created_at: string }[];
};

export function PlatformStudiosConsole({ detailMode = false }: { detailMode?: boolean }) {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const params = useParams<{ id?: string }>();
  const studioId = detailMode ? params?.id || "" : "";
  const [query, setQuery] = useState("");
  const [studios, setStudios] = useState<StudioSummary[]>([]);
  const [studioDetail, setStudioDetail] = useState<StudioDetail | null>(null);
  const [pageState, setPageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [studioName, setStudioName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [overridePlanKey, setOverridePlanKey] = useState("pro");
  const [overrideStatus, setOverrideStatus] = useState("manual_override");
  const [overrideNote, setOverrideNote] = useState("");
  const canProvision = hasRole(user, "super_admin");

  const listUrl = useMemo(() => {
    const search = query.trim();
    return search ? `${baseUrl}/auth/platform/studios?query=${encodeURIComponent(search)}` : `${baseUrl}/auth/platform/studios`;
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
        const response = await fetch(detailMode ? `${baseUrl}/auth/platform/studios/${studioId}` : listUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setPageState("error");
          setFeedback(await parseError(response, `Studio load failed (${response.status})`));
          return;
        }
        if (detailMode) {
          setStudioDetail((await response.json()) as StudioDetail);
        } else {
          const body = (await response.json()) as { items: StudioSummary[] };
          setStudios(body.items);
        }
        setPageState("ready");
      } catch {
        setPageState("error");
        setFeedback(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [baseUrl, detailMode, listUrl, studioId, user]);

  async function createStudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/studios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: studioName }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Studio create failed (${response.status})`);
        setFeedback(message);
        toast.error("Studio creation failed", { description: message });
        return;
      }
      setStudioName("");
      toast.success("Studio created", { description: "Assign an owner when you are ready." });
      setFeedback("Studio created successfully.");
      setPageState("ready");
      setQuery("");
      const body = (await response.json()) as { studio: StudioSummary };
      setStudios((current) => [body.studio, ...current]);
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function assignOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studioId) return;
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/studios/${studioId}/assign-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: ownerEmail }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Owner assignment failed (${response.status})`);
        setFeedback(message);
        toast.error("Owner assignment failed", { description: message });
        return;
      }
      const nextOwnerEmail = ownerEmail;
      const body = (await response.json()) as { mode: string };
      setOwnerEmail("");
      const description = body.mode === "invited" ? "Owner invite sent." : "Owner assigned successfully.";
      setFeedback(description);
      toast.success("Studio owner updated", { description });
      setStudioDetail((current) =>
        current
          ? {
              ...current,
              studio: {
                ...current.studio,
                owner_email: body.mode === "assigned" ? nextOwnerEmail : current.studio.owner_email,
              },
            }
          : current,
      );
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function applyBillingOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studioId) return;
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/studios/${studioId}/billing-override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_key: overridePlanKey,
          subscription_status: overrideStatus,
          override_note: overrideNote,
        }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Billing override failed (${response.status})`);
        setFeedback(message);
        toast.error("Billing override failed", { description: message });
        return;
      }
      const body = (await response.json()) as { usage: StudioDetail["usage"] };
      setStudioDetail((current) => (current ? { ...current, usage: body.usage || current.usage } : current));
      toast.success("Billing override applied", { description: "Studio plan and override state were updated." });
      setFeedback("Billing override applied.");
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  if (state === "loading") return <main className="p-6">Loading platform...</main>;
  if (state === "unauthorized") {
    return <main className="p-6"><EmptyState title="Session required" detail="Please sign in to access platform studios." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} /></main>;
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user || !(hasRole(user, "super_admin") || hasRole(user, "support"))) {
    return <main className="p-6"><ErrorState detail="Platform studio access required." /></main>;
  }

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
          eyebrow="Studios"
          title={detailMode ? studioDetail?.studio.name || "Studio detail" : "Studios"}
          subtitle={detailMode ? "Review studio ownership, usage, and project presence without entering studio-side workflow." : "Manage real customer studios without bouncing through internal theater screens."}
          actions={!detailMode && canProvision ? <Link href="/app/platform/studios" className="rounded-md border border-border px-4 py-2 text-sm font-medium">Studio directory</Link> : undefined}
        />

        {!detailMode && canProvision ? (
          <SectionCard title="Create Studio" subtitle="Provision a studio directly from the platform control plane">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={createStudio}>
              <div className="flex-1">
                <Label htmlFor="studio-name">Studio name</Label>
                <Input id="studio-name" className="mt-2" value={studioName} onChange={(event) => setStudioName(event.target.value)} placeholder="Northern Lights Studio" required />
              </div>
              <div className="sm:self-end">
                <Button type="submit" disabled={!studioName.trim()}>
                  Create Studio
                </Button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        {detailMode ? (
          pageState === "loading" ? (
            <LoadingSkeleton lines={6} />
          ) : pageState === "error" ? (
            <ErrorState detail={feedback || "Unable to load studio detail."} />
          ) : studioDetail ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Owner" value={studioDetail.studio.owner_email || "Unassigned"} />
                <StatTile label="Members" value={studioDetail.studio.member_count} />
                <StatTile label="Projects" value={studioDetail.studio.project_count} />
                <StatTile label="Plan" value={(studioDetail.usage?.plan_key || studioDetail.studio.plan_key || "free").toUpperCase()} />
              </div>
              {studioDetail.usage ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatTile label="Storage" value={`${studioDetail.usage.storage_used_gb} GB`} hint={studioDetail.usage.storage_limit_gb ? `of ${studioDetail.usage.storage_limit_gb} GB` : "No storage cap"} />
                  <StatTile label="Projects used" value={studioDetail.usage.projects_used} hint={studioDetail.usage.projects_limit ? `of ${studioDetail.usage.projects_limit}` : "Unlimited"} />
                  <StatTile label="Active uploads" value={studioDetail.usage.active_upload_sessions} />
                  <StatTile label="Active sessions" value={studioDetail.usage.active_browser_sessions} hint={studioDetail.usage.subscription_status} />
                </div>
              ) : null}
              {canProvision ? (
                <SectionCard title="Assign Studio Owner" subtitle="Set or replace the primary studio owner">
                  <form className="flex flex-col gap-3 sm:flex-row" onSubmit={assignOwner}>
                    <div className="flex-1">
                      <Label htmlFor="owner-email">Owner email</Label>
                      <Input id="owner-email" className="mt-2" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@studio.com" required />
                    </div>
                    <div className="sm:self-end">
                      <Button type="submit" disabled={!ownerEmail.trim()}>
                        Assign Owner
                      </Button>
                    </div>
                  </form>
                </SectionCard>
              ) : null}
              {canProvision ? (
                <SectionCard title="Billing Override" subtitle="Apply a manual plan or grace-state change without leaving the platform surface.">
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={applyBillingOverride}>
                    <div>
                      <Label htmlFor="override-plan">Plan key</Label>
                      <Input id="override-plan" className="mt-2" value={overridePlanKey} onChange={(event) => setOverridePlanKey(event.target.value)} placeholder="pro" required />
                    </div>
                    <div>
                      <Label htmlFor="override-status">Subscription status</Label>
                      <Input id="override-status" className="mt-2" value={overrideStatus} onChange={(event) => setOverrideStatus(event.target.value)} placeholder="grace" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="override-note">Override note</Label>
                      <Input id="override-note" className="mt-2" value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Manual grace for a live wedding week" />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={!overridePlanKey.trim()}>
                        Apply billing override
                      </Button>
                    </div>
                  </form>
                  {studioDetail.usage?.manual_override.enabled ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Manual override active{studioDetail.usage.manual_override.note ? ` · ${studioDetail.usage.manual_override.note}` : ""}.
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}
              <SectionCard title="Studio Members" subtitle="Current active members in this studio">
                <div className="space-y-2">
                  {studioDetail.members.map((member) => (
                    <div key={member.id} className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-sm font-semibold">{member.email || member.username || member.id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{member.roles.join(", ")} · {member.account_type}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Studio Projects" subtitle="Projects currently attached to this studio">
                <div className="space-y-2">
                  {studioDetail.projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet.</p> : null}
                  {studioDetail.projects.map((project) => (
                    <div key={project.id} className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-sm font-semibold">{project.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{project.status} · {new Date(project.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          ) : (
            <EmptyState title="Studio unavailable" detail="The requested studio could not be found." />
          )
        ) : (
          <>
            <SectionCard title="Studio Directory" subtitle="Search and inspect all studios across the platform">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by studio name or slug" />
              </div>
            </SectionCard>
            {pageState === "loading" ? <LoadingSkeleton lines={5} /> : null}
            {pageState === "error" ? <ErrorState detail={feedback || "Unable to load studios."} /> : null}
            {pageState === "ready" ? (
              <SectionCard title="Studios" subtitle="Current tenant list for the platform">
                <div className="space-y-3">
                  {studios.length === 0 ? <EmptyState title="No studios found" detail="Create a studio or adjust the search to continue." /> : null}
                  {studios.map((studio) => (
                    <Link key={studio.id} href={`/app/platform/studios/${studio.id}`} className="block rounded-2xl border border-border bg-background px-4 py-4 transition hover:bg-accent hover:text-accent-foreground">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{studio.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{studio.owner_email || "Owner not assigned"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-primary">{(studio.plan_key || "free").toUpperCase()}</span>
                          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">{studio.member_count} members</span>
                          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">{studio.project_count} projects</span>
                          {studio.subscription_status ? <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">{studio.subscription_status}</span> : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </>
        )}

        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </div>
    </AppShell>
  );
}
