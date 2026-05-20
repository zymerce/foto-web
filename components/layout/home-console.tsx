"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FolderKanban, Sparkles, UploadCloud, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage } from "@/lib/api-client";
import { ensureAccessToken, hasRole, isPlatformUser } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  asset_count: number;
  cover_preview_url: string | null;
  latest_submission_at: string | null;
  selection_status: string;
  photographer_count: number;
  client_count: number;
  share_link_active: boolean;
  upload_status: {
    status: string;
    uploaded_count: number;
    files_total: number;
    failed_count: number;
  } | null;
  can_upload: boolean;
  can_select: boolean;
};

type BillingInfo = {
  current_plan: string;
  projects_used: number;
  projects_limit: number | null;
  storage_used_gb: number;
  storage_limit_gb: number | null;
};

const studioCardBase =
  "group rounded-[28px] border border-border/80 bg-card/95 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl";

function statusLabel(project: ProjectSummary) {
  if (project.selection_status === "submitted") return "Client picks submitted";
  if (project.share_link_active) return "Share link live";
  if (project.client_count > 0) return "Client review in progress";
  if (project.upload_status?.status === "completed") return "Upload complete";
  if (project.upload_status?.status === "active") return "Upload in progress";
  return "Ready for delivery setup";
}

function statusTone(project: ProjectSummary) {
  if (project.selection_status === "submitted") return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (project.upload_status?.failed_count) return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  if (project.share_link_active) return "bg-primary/12 text-primary";
  return "bg-muted text-muted-foreground";
}

export function HomeConsole({ forcePlatform = false }: { forcePlatform?: boolean }) {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [contentState, setContentState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [contentError, setContentError] = useState("");

  const roles = user?.roles || [];
  const platformMode = forcePlatform || isPlatformUser(user);
  const studioName = user?.studio?.name || user?.workspace?.name || "Your Studio";
  const isCustomer = user?.account_type === "client";
  const isAdmin = hasRole(user, "admin") && !platformMode;
  const isPhotographer = hasRole(user, "photographer") && !platformMode;

  useEffect(() => {
    if (state !== "ready" || platformMode) return;
    let cancelled = false;
    const run = async () => {
      setContentState("loading");
      setContentError("");
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          if (!cancelled) {
            setContentState("error");
            setContentError("Session expired. Please sign in again.");
          }
          return;
        }
        const projectsPath = isCustomer ? "/auth/customer/projects" : "/auth/projects";
        const requests: Promise<Response>[] = [
          fetch(`${baseUrl}${projectsPath}`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        if (!isCustomer) {
          requests.push(fetch(`${baseUrl}/auth/billing/usage`, { headers: { Authorization: `Bearer ${token}` } }));
        }
        const [projectsResponse, billingResponse] = await Promise.all(requests);
        if (!projectsResponse.ok) {
          throw new Error(`Unable to load recent projects (${projectsResponse.status})`);
        }
        const projectsBody = (await projectsResponse.json()) as { items: ProjectSummary[] };
        if (cancelled) return;
        setProjects(projectsBody.items);
        if (billingResponse) {
          if (billingResponse.ok) {
            const billingBody = (await billingResponse.json()) as BillingInfo;
            if (!cancelled) setBilling(billingBody);
          } else if (!cancelled) {
            setBilling(null);
          }
        }
        if (!cancelled) setContentState("ready");
      } catch (error) {
        if (!cancelled) {
          setContentState("error");
          setContentError(error instanceof Error ? error.message : apiNetworkErrorMessage(baseUrl));
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, isCustomer, platformMode, state]);

  const quickLinks = useMemo(() => {
    if (platformMode) {
      return [
        { href: "/app/platform/studios", label: "Studios" },
        { href: "/app/platform/users", label: "Users" },
        { href: "/app/platform/support/home", label: "Support" },
        { href: "/app/platform/advanced", label: "Advanced" },
      ];
    }
    if (isCustomer) {
      return [
        { href: "/app/customer/selections", label: "Open gallery" },
        { href: "/app/customer/history", label: "View history" },
      ];
    }
    if (isPhotographer) {
      return [
        { href: "/app/projects", label: "Assigned projects" },
        { href: "/app/uploads", label: "Upload status" },
      ];
    }
    return [
      { href: "/app/projects", label: "Create project" },
      { href: "/app/projects", label: "Share gallery" },
      { href: "/app/uploads", label: "Check uploads" },
      { href: "/app/settings?tab=billing", label: "Billing" },
    ];
  }, [isCustomer, isPhotographer, platformMode]);

  const primaryHref = platformMode
    ? hasRole(user, "support")
      ? "/app/platform/support/home"
      : "/app/platform/studios"
    : isCustomer
      ? "/app/customer/selections"
      : "/app/projects";

  const aggregateAssets = projects.reduce((sum, project) => sum + project.asset_count, 0);
  const submittedProjects = projects.filter((project) => project.selection_status === "submitted").length;

  if (state === "loading") return <main className="p-6">Loading studio...</main>;
  if (state === "unauthorized") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl p-6">
        <EmptyState title="Session required" detail="Please sign in to continue." cta={<Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/login">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;

  return (
    <AppShell
      roles={roles}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type}
      userLabel={user?.username || user?.email || "Member"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={studioName}
      shellMode={platformMode ? "platform" : "studio"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={platformMode ? "Platform Home" : isCustomer ? "Client Review" : isPhotographer ? "Assigned Work" : "Studio Home"}
          title={platformMode ? "Operate fotoz.io with confidence" : isCustomer ? `Review from ${studioName}` : `Keep ${studioName} moving`}
          subtitle={
            platformMode
              ? "Studios, users, support, and advanced governance stay in one calm operational surface."
              : isCustomer
                ? "Pick favorites, save drafts, and send final selections without losing the visual context of the shoot."
                : isPhotographer
                  ? "Open the projects that need attention, track upload progress, and keep delivery moving without digging through admin controls."
                  : "Recent shoots, upload exceptions, and client readiness now sit in one visual workspace instead of a wall of operational text."
          }
          actions={<Link href={primaryHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">{platformMode ? "Open platform" : isCustomer ? "Open gallery" : "Open projects"}<ArrowRight className="size-4" /></Link>}
        />

        {user?.requires_remediation ? (
          <ErrorState detail={`Account remediation required before normal operations continue. Flags: ${(user.integrity_flags || []).join(", ") || "integrity_review_required"}.`} />
        ) : null}

        <section className="relative overflow-hidden rounded-[32px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent)] p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="size-3.5" />
                {platformMode ? "Operations" : isCustomer ? "Selection-ready" : "Recent work first"}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {platformMode ? "The whole platform, without the studio clutter." : isCustomer ? "Your latest galleries are ready for a clear review flow." : "Lead with the work, not the wiring."}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {platformMode
                    ? "Support, audit, governance, and studio oversight stay separated so every operator sees the right surface by default."
                    : isCustomer
                      ? "Every project card keeps the cover image, draft state, and submit path visible so the experience feels intentional on both desktop and mobile."
                      : "Recent projects now carry real thumbnails, upload state, client readiness, and the next step your studio actually cares about."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((item) => (
                  <Link key={item.href + item.label} href={item.href} className="rounded-full border border-border/80 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {!platformMode && billing?.current_plan === "free" && isAdmin ? (
              <Link href="/app/settings?tab=billing" className="block min-w-full rounded-[28px] border border-primary/20 bg-primary/10 p-5 text-left transition hover:bg-primary/15 lg:min-w-[22rem]">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Growth Hook</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Free Plan · {billing.projects_used}/{billing.projects_limit ?? "∞"} Projects Used
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upgrade to Pro for larger active project limits, Helper-driven upload capacity, and a smoother client delivery rhythm.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open billing <ArrowRight className="size-4" />
                </p>
              </Link>
            ) : (
              <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[24rem] lg:max-w-[28rem]">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visible projects</p>
                  <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assets</p>
                  <p className="mt-2 text-2xl font-semibold">{aggregateAssets}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Submitted</p>
                  <p className="mt-2 text-2xl font-semibold">{submittedProjects}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {platformMode ? (
          <SectionCard title="Platform focus" subtitle="Your primary operating surfaces stay clear and role-aware.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  href: "/app/platform/studios",
                  title: "Studios",
                  detail: "Provision, inspect, and hand off studio ownership without entering studio-side UI.",
                  icon: FolderKanban,
                },
                {
                  href: "/app/platform/users",
                  title: "Users",
                  detail: "Review account integrity, role scope, and remediation flags in one place.",
                  icon: Users,
                },
                {
                  href: "/app/platform/support/home",
                  title: "Support",
                  detail: "Recovery-safe actions, diagnostics, and escalation follow-through stay in one desk.",
                  icon: CheckCircle2,
                },
                {
                  href: "/app/platform/advanced",
                  title: "Advanced",
                  detail: "Keep audit, announcements, and emergency controls out of the daily operator path.",
                  icon: UploadCloud,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={studioCardBase}>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title={isCustomer ? "Assigned galleries" : "Recent projects"} subtitle={isCustomer ? "Open the gallery you want to review and keep the selection flow visual from the very first screen." : "Every card keeps the cover frame, upload signal, and client review state in view so the studio feels alive."}>
            {contentState === "loading" || contentState === "idle" ? (
              <LoadingSkeleton lines={8} />
            ) : contentState === "error" ? (
              <ErrorState detail={contentError || "Unable to load recent projects."} />
            ) : projects.length === 0 ? (
              <EmptyState
                title={isCustomer ? "No gallery yet" : "No recent projects yet"}
                detail={isCustomer ? "Your studio has not granted a gallery yet. Once they do, the latest shoot will appear here with a direct review path." : "Create your first project to start uploads, share a review link, and keep the studio experience visually grounded from day one."}
                cta={<Link href={isCustomer ? "/app/customer/selections" : "/app/projects"} className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{isCustomer ? "Open selections" : "Create your first project"}</Link>}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {projects.slice(0, 6).map((project) => (
                  <article key={project.id} className={studioCardBase}>
                    <div className="overflow-hidden rounded-[22px] border border-border bg-muted">
                      {project.cover_preview_url ? (
                        <img src={project.cover_preview_url} alt={project.name} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent)] px-6 text-center text-sm text-muted-foreground">
                          Upload the first selects to give this project a visual cover.
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold tracking-tight">{project.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{statusLabel(project)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(project)}`}>
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                        <p className="uppercase tracking-[0.16em]">Assets</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{project.asset_count}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                        <p className="uppercase tracking-[0.16em]">Team</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{project.photographer_count}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                        <p className="uppercase tracking-[0.16em]">Clients</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{project.client_count}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {project.upload_status ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1">
                          <UploadCloud className="size-3.5" />
                          {project.upload_status.uploaded_count}/{project.upload_status.files_total} uploaded
                        </span>
                      ) : null}
                      {project.share_link_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                          <CheckCircle2 className="size-3.5" />
                          Share link live
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <Link href={isCustomer ? "/app/customer/selections" : "/app/projects"} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        {isCustomer ? "Open gallery" : "Open project"}
                        <ArrowRight className="size-4" />
                      </Link>
                      {project.latest_submission_at ? (
                        <p className="text-xs text-muted-foreground">Updated {new Date(project.latest_submission_at).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Awaiting final picks</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        )}

      </div>
    </AppShell>
  );
}
