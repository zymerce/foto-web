"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Link2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, fetchMe, isPlatformUser, startHelperConnect } from "@/lib/session";

type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  workspace_id: string;
  created_at: string;
  asset_count: number;
  cover_preview_url: string | null;
  latest_submission_at: string | null;
  selection_status: string;
  photographer_count: number;
  client_count: number;
  share_link_active: boolean;
  share_link?: {
    id: string;
    status: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    url?: string;
  } | null;
  upload_status: {
    status: string;
    uploaded_count: number;
    files_total: number;
    failed_count: number;
  } | null;
  can_upload: boolean;
  can_select: boolean;
};

type ProjectDetail = {
  project: ProjectSummary;
  photographers: { id: string; email: string | null; username: string | null }[];
  clients: { id: string; email: string | null; username: string | null }[];
  uploads: {
    id: string;
    status: string;
    files_total: number;
    uploaded_count: number;
    failed_count: number;
    created_at: string;
  }[];
  assets: {
    id: string;
    file_name: string;
    preview_url: string | null;
  }[];
  selection: {
    draft_asset_ids: string[];
    submissions: { id: string; selected_asset_ids: string[]; submitted_at: string }[];
    public_submissions: { id: string; reviewer_name: string | null; selected_asset_ids: string[]; submitted_at: string }[];
  };
  gallery_link: {
    id: string;
    status: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
  } | null;
};

const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters.").max(120, "Project name is too long."),
});

const accessSchema = z.object({
  email: z.email("Enter a valid email address."),
});

type ProjectValues = z.infer<typeof projectSchema>;
type AccessValues = z.infer<typeof accessSchema>;

export default function ProjectsPage() {
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "forbidden" | "error">("loading");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [user, setUser] = useState<Awaited<ReturnType<typeof fetchMe>>["user"] | null>(null);
  const [launchingId, setLaunchingId] = useState("");
  const [creatingShareLink, setCreatingShareLink] = useState(false);
  const [detail, setDetail] = useState("");

  const baseUrl = apiBaseUrl();
  const permissionBag = useMemo(() => new Set(user?.permissions || []), [user]);
  const canCreate = permissionBag.has("projects:create");
  const canManagePeople = permissionBag.has("workspace_members:manage");
  const canGrantClientAccess = permissionBag.has("client_access:grant");

  const createForm = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "" },
  });
  const photographerForm = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { email: "" },
  });
  const clientForm = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { email: "" },
  });

  const loadProjectDetail = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        setProjectDetail(null);
        setDetailState("idle");
        return;
      }
      const token = await ensureAccessToken(baseUrl);
      if (!token) {
        setDetailState("error");
        setDetail("Session expired. Please sign in again.");
        return;
      }
      const response = await fetch(`${baseUrl}/auth/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setDetailState("error");
        setDetail(`Unable to load project detail (${response.status})`);
        return;
      }
      const body = (await response.json()) as ProjectDetail;
      setProjectDetail(body);
      setDetailState("ready");
    },
    [baseUrl],
  );

  const loadProjects = useCallback(async () => {
    const me = await fetchMe(baseUrl);
    if (!me.ok) {
      setState(me.status === 401 ? "unauthorized" : "error");
      setDetail(me.detail || (me.status === 401 ? "" : `Unable to load session (${me.status}).`));
      return;
    }
    if (!(me.user?.permissions || []).includes("projects:read")) {
      setUser(me.user || null);
      setState("forbidden");
      return;
    }
    if (isPlatformUser(me.user || null)) {
      setUser(me.user || null);
      setState("forbidden");
      setDetail("Platform operators do not use studio project routes.");
      return;
    }
    setUser(me.user || null);
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setState("unauthorized");
      return;
    }
    const response = await fetch(`${baseUrl}/auth/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setState("error");
      setDetail(`Unable to load projects (${response.status})`);
      return;
    }
    const body = (await response.json()) as { items: ProjectSummary[] };
    setProjects(body.items);
    const nextProjectId = selectedProjectId || body.items[0]?.id || "";
    setSelectedProjectId(nextProjectId);
    if (nextProjectId) setDetailState("loading");
    setState("ready");
  }, [baseUrl, selectedProjectId]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadProjects();
      } catch {
        setState("error");
        setDetail(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [baseUrl, loadProjects]);

  useEffect(() => {
    if (state !== "ready") return;
    const run = async () => {
      try {
        await loadProjectDetail(selectedProjectId);
      } catch {
        setDetailState("error");
        setDetail(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [loadProjectDetail, selectedProjectId, state, baseUrl]);

  async function createProject(values: ProjectValues) {
    setDetail("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      createForm.setError("root", { message: "Session expired. Please sign in again." });
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const message = await parseError(response, `Project creation failed (${response.status})`);
        createForm.setError("root", { message });
        toast.error("Project creation failed", { description: message });
        return;
      }
      const body = (await response.json()) as { project: ProjectSummary };
      createForm.reset();
      await loadProjects();
      setSelectedProjectId(body.project.id);
      toast.success("Project created", { description: "You can now assign access and connect Helper." });
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      createForm.setError("root", { message });
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function launchHelperUpload(projectId: string) {
    setLaunchingId(projectId);
    setDetail("");
    try {
      const result = await startHelperConnect(baseUrl, projectId);
      if (!result.ok || !result.deepLink) {
        const message = result.detail || "Unable to connect helper.";
        setDetail(message);
        toast.error("Helper launch failed", { description: message });
        return;
      }
      toast.success("Launching Helper", { description: "Opening a one-time connect session for this project." });
      window.open(result.deepLink, "_self");
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setDetail(message);
      toast.error("Cannot reach the API", { description: message });
    } finally {
      setLaunchingId("");
    }
  }

  async function assignPhotographer(values: AccessValues) {
    if (!selectedProjectId) return;
    setDetail("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      photographerForm.setError("root", { message: "Session expired. Please sign in again." });
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}/assign-photographer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const message = await parseError(response, `Photographer assignment failed (${response.status})`);
        photographerForm.setError("root", { message });
        toast.error("Could not assign photographer", { description: message });
        return;
      }
      const body = (await response.json()) as { mode: string };
      photographerForm.reset();
      await loadProjectDetail(selectedProjectId);
      toast.success(
        body.mode === "assigned" ? "Photographer assigned" : "Photographer invited",
        {
          description:
            body.mode === "assigned"
              ? "The existing account now has project access."
              : "A project-scoped invite has been sent.",
        },
      );
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      photographerForm.setError("root", { message });
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function grantClientAccess(values: AccessValues) {
    if (!selectedProjectId) return;
    setDetail("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      clientForm.setError("root", { message: "Session expired. Please sign in again." });
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}/grant-client-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const message = await parseError(response, `Client access failed (${response.status})`);
        clientForm.setError("root", { message });
        toast.error("Could not grant client access", { description: message });
        return;
      }
      const body = (await response.json()) as { mode: string };
      clientForm.reset();
      await loadProjectDetail(selectedProjectId);
      toast.success(body.mode === "granted" ? "Client access granted" : "Client invited", {
        description:
          body.mode === "granted"
            ? "The existing client account can review this gallery now."
            : "A project-scoped client invite has been sent.",
      });
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      clientForm.setError("root", { message });
      toast.error("Cannot reach the API", { description: message });
    }
  }

  async function createShareLink() {
    if (!selectedProjectId) return;
    setCreatingShareLink(true);
    setDetail("");
    try {
      const token = await ensureAccessToken(baseUrl);
      if (!token) {
        setDetail("Session expired. Please sign in again.");
        return;
      }
      const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}/share-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expires_in_days: 14 }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Could not create gallery link (${response.status})`);
        setDetail(message);
        toast.error("Share link failed", { description: message });
        return;
      }
      const body = (await response.json()) as { share_link: { url?: string } };
      if (body.share_link?.url && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body.share_link.url);
      }
      await loadProjects();
      await loadProjectDetail(selectedProjectId);
      toast.success("Share link ready", { description: body.share_link?.url ? "The secure gallery link is copied to your clipboard." : "Secure gallery access is now live." });
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setDetail(message);
      toast.error("Cannot reach the API", { description: message });
    } finally {
      setCreatingShareLink(false);
    }
  }

  if (state === "loading") return <main className="p-6">Loading...</main>;
  if (state === "unauthorized") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl p-6">
        <EmptyState title="Session required" detail="Please sign in to continue." cta={<Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/login">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "forbidden") return <main className="p-6"><ErrorState detail="You do not have project access in this studio." /></main>;
  if (state === "error") return <main className="p-6"><ErrorState detail={detail || "Unable to load projects."} /></main>;

  return (
    <AppShell
      roles={user?.roles || []}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type}
      userLabel={user?.username || user?.email || "Member"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={user?.studio?.name || user?.workspace?.name}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Projects"
          title="Studio projects"
          subtitle="Create the project, assign photographers, grant client gallery access, and launch Helper from a real operational context."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Projects" value={projects.length} hint="Visible through assignment-aware access" />
          <StatTile label="Assets" value={projects.reduce((sum, project) => sum + project.asset_count, 0)} hint="Uploaded gallery items across your visible projects" />
          <StatTile label="Selections" value={projects.filter((project) => project.latest_submission_at).length} hint="Projects with at least one client submission" />
        </div>

        {canCreate ? (
          <SectionCard title="Create project" subtitle="New studio projects become the source of truth for uploads, assignments, and client review.">
            <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={createForm.handleSubmit(createProject)} noValidate>
              <div className="flex-1 space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input id="project-name" placeholder="Spring campaign shoot" aria-invalid={!!createForm.formState.errors.name} {...createForm.register("name")} />
                {createForm.formState.errors.name ? <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p> : null}
                {createForm.formState.errors.root ? <p className="text-sm text-destructive">{createForm.formState.errors.root.message}</p> : null}
              </div>
              <Button type="submit" disabled={createForm.formState.isSubmitting} className="sm:self-end">
                {createForm.formState.isSubmitting ? <Spinner /> : null}
                <span>{createForm.formState.isSubmitting ? "Creating..." : "Create project"}</span>
              </Button>
            </form>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SectionCard title="Project list" subtitle="Photographers and clients only see projects they are explicitly assigned to.">
            <div className="space-y-3">
              {projects.map((project) => {
                const active = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setDetailState("loading");
                      setSelectedProjectId(project.id);
                    }}
                    className={active ? "w-full rounded-[24px] border border-primary bg-primary/5 p-4 text-left transition" : "w-full rounded-[24px] border border-border bg-background p-4 text-left transition hover:bg-accent hover:text-accent-foreground"}
                  >
                    <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                      {project.cover_preview_url ? (
                        <img src={project.cover_preview_url} alt={project.name} className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent)] px-4 text-center text-xs text-muted-foreground">
                          The first uploaded image becomes this project cover.
                        </div>
                      )}
                    </div>
                    <p className="font-medium">{project.name}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{project.asset_count} assets · {project.photographer_count} photographers · {project.client_count} clients</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {project.latest_submission_at ? `Last client submission ${new Date(project.latest_submission_at).toLocaleString()}` : project.share_link_active ? "Secure gallery link is live" : "No client submission yet"}
                    </p>
                  </button>
                );
              })}
              {projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet. Create your first studio workflow project to continue.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title={projectDetail?.project.name || "Project detail"} subtitle="One project view for helper sync, team assignments, client access, and selection progress.">
            {detailState === "loading" ? (
              <LoadingSkeleton lines={8} />
            ) : detailState === "error" ? (
              <ErrorState detail={detail || "Unable to load project detail."} />
            ) : !projectDetail ? (
              <EmptyState title="Select a project" detail="Choose a project to review its upload and client workflow state." />
            ) : (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent)]">
                  <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="border-b border-border/70 lg:border-b-0 lg:border-r">
                      {projectDetail.project.cover_preview_url ? (
                        <img src={projectDetail.project.cover_preview_url} alt={projectDetail.project.name} className="aspect-[16/10] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                          Upload the first delivered images to turn this project into a visual proof point for your studio.
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 p-5 sm:p-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Project rhythm</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight">{projectDetail.project.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Keep uploads, client access, and final selections centered in one project view instead of scattering the workflow across separate admin screens.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Assets</p>
                          <p className="mt-1 text-lg font-semibold">{projectDetail.assets.length}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Uploads</p>
                          <p className="mt-1 text-lg font-semibold">{projectDetail.uploads.length}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Submissions</p>
                          <p className="mt-1 text-lg font-semibold">{projectDetail.selection.submissions.length + projectDetail.selection.public_submissions.length}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canGrantClientAccess ? (
                          <Button type="button" variant="outline" disabled={creatingShareLink} onClick={createShareLink}>
                            {creatingShareLink ? <Spinner /> : <Link2 className="size-4" />}
                            <span>{creatingShareLink ? "Creating link..." : projectDetail.gallery_link ? "Refresh secure link" : "Create secure link"}</span>
                          </Button>
                        ) : null}
                        {projectDetail.project.can_upload ? (
                          <Button type="button" disabled={launchingId === projectDetail.project.id} onClick={() => launchHelperUpload(projectDetail.project.id)}>
                            {launchingId === projectDetail.project.id ? <Spinner /> : null}
                            <span>{launchingId === projectDetail.project.id ? "Connecting..." : "Connect Helper"}</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {projectDetail.gallery_link ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Secure gallery link is ready</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Lightweight public review stays available until {projectDetail.gallery_link.expires_at ? new Date(projectDetail.gallery_link.expires_at).toLocaleDateString() : "you revoke it"}.
                        </p>
                      </div>
                      <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                        <CheckCircle2 className="size-4" />
                        Marketing-safe fast review path
                      </p>
                    </div>
                  </div>
                ) : null}

                {(canManagePeople || canGrantClientAccess) ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {canManagePeople ? (
                      <form className="space-y-4 rounded-xl border border-border bg-background p-4" onSubmit={photographerForm.handleSubmit(assignPhotographer)} noValidate>
                        <div>
                          <p className="text-sm font-medium">Assign photographer</p>
                          <p className="mt-1 text-xs text-muted-foreground">Existing users are assigned instantly. New users receive a project-scoped invite.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="photographer-email">Photographer email</Label>
                          <Input id="photographer-email" type="email" placeholder="photographer@example.com" aria-invalid={!!photographerForm.formState.errors.email} {...photographerForm.register("email")} />
                          {photographerForm.formState.errors.email ? <p className="text-sm text-destructive">{photographerForm.formState.errors.email.message}</p> : null}
                          {photographerForm.formState.errors.root ? <p className="text-sm text-destructive">{photographerForm.formState.errors.root.message}</p> : null}
                        </div>
                        <Button type="submit" variant="outline" disabled={photographerForm.formState.isSubmitting}>
                          {photographerForm.formState.isSubmitting ? <Spinner /> : null}
                          <span>{photographerForm.formState.isSubmitting ? "Assigning..." : "Assign photographer"}</span>
                        </Button>
                      </form>
                    ) : null}

                    {canGrantClientAccess ? (
                      <form className="space-y-4 rounded-xl border border-border bg-background p-4" onSubmit={clientForm.handleSubmit(grantClientAccess)} noValidate>
                        <div>
                          <p className="text-sm font-medium">Grant client access</p>
                          <p className="mt-1 text-xs text-muted-foreground">Clients receive gallery access only to this project, never the whole studio.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-email">Client email</Label>
                          <Input id="client-email" type="email" placeholder="client@example.com" aria-invalid={!!clientForm.formState.errors.email} {...clientForm.register("email")} />
                          {clientForm.formState.errors.email ? <p className="text-sm text-destructive">{clientForm.formState.errors.email.message}</p> : null}
                          {clientForm.formState.errors.root ? <p className="text-sm text-destructive">{clientForm.formState.errors.root.message}</p> : null}
                        </div>
                        <Button type="submit" variant="outline" disabled={clientForm.formState.isSubmitting}>
                          {clientForm.formState.isSubmitting ? <Spinner /> : null}
                          <span>{clientForm.formState.isSubmitting ? "Granting..." : "Grant client access"}</span>
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">Photographers</p>
                    <div className="mt-3 space-y-2">
                      {projectDetail.photographers.length > 0 ? projectDetail.photographers.map((person) => (
                        <p key={person.id} className="text-sm text-muted-foreground">{person.username || person.email || person.id}</p>
                      )) : <p className="text-sm text-muted-foreground">No photographers assigned yet.</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">Clients</p>
                    <div className="mt-3 space-y-2">
                      {projectDetail.clients.length > 0 ? projectDetail.clients.map((person) => (
                        <p key={person.id} className="text-sm text-muted-foreground">{person.username || person.email || person.id}</p>
                      )) : <p className="text-sm text-muted-foreground">No client access granted yet.</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">Client submissions</p>
                    <div className="mt-3 space-y-2">
                      {projectDetail.selection.submissions.length > 0 ? projectDetail.selection.submissions.map((submission) => (
                        <p key={submission.id} className="text-sm text-muted-foreground">{submission.selected_asset_ids.length} picks · {new Date(submission.submitted_at).toLocaleString()}</p>
                      )) : <p className="text-sm text-muted-foreground">No final client submission yet.</p>}
                      {projectDetail.selection.public_submissions.length > 0 ? projectDetail.selection.public_submissions.map((submission) => (
                        <p key={submission.id} className="text-sm text-muted-foreground">{submission.selected_asset_ids.length} public picks{submission.reviewer_name ? ` · ${submission.reviewer_name}` : ""} · {new Date(submission.submitted_at).toLocaleString()}</p>
                      )) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">Recent upload sessions</p>
                    <div className="mt-3 space-y-3">
                      {projectDetail.uploads.length > 0 ? projectDetail.uploads.map((upload) => (
                        <div key={upload.id} className="rounded-lg border border-border px-3 py-3">
                          <p className="text-sm font-medium">{upload.status}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{upload.uploaded_count}/{upload.files_total} uploaded · {upload.failed_count} failed</p>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No uploads recorded for this project yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">Gallery assets</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {projectDetail.assets.length > 0 ? projectDetail.assets.slice(0, 6).map((asset) => (
                        <div key={asset.id} className="rounded-lg border border-border p-3">
                          {asset.preview_url ? (
                            <img src={asset.preview_url} alt={asset.file_name} className="aspect-[4/3] w-full rounded-md border border-border object-cover" />
                          ) : (
                            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
                              Preview ready when storage is configured
                            </div>
                          )}
                          <p className="mt-2 truncate text-sm text-muted-foreground">{asset.file_name}</p>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Uploaded assets will appear here after Helper finalizes a batch.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {detail ? <p className="mt-4 text-sm text-muted-foreground">{detail}</p> : null}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
