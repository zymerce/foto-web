"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type CustomerProject = {
  id: string;
  name: string;
  status: string;
  asset_count: number;
  cover_preview_url: string | null;
  latest_submission_at: string | null;
  selection_status: string;
};

type ProjectDetail = {
  project: CustomerProject & { can_select: boolean };
  assets: {
    id: string;
    file_name: string;
    preview_url: string | null;
  }[];
  selection: {
    draft_asset_ids: string[];
    submissions: {
      id: string;
      selected_asset_ids: string[];
      submitted_at: string;
    }[];
  };
};

export default function CustomerSelectionsPage() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [projectsState, setProjectsState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canSelect = useMemo(() => user?.permissions?.includes("selections:submit") ?? false, [user]);

  useEffect(() => {
    if (state !== "ready" || user?.account_type !== "client") return;
    let cancelled = false;
    const run = async () => {
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          if (!cancelled) {
            setProjectsState("error");
            setStatus("Session expired. Please sign in again.");
          }
          return;
        }
        const response = await fetch(`${baseUrl}/auth/customer/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) {
            const message = `Unable to load client projects (${response.status})`;
            setProjectsState("error");
            setStatus(message);
          }
          return;
        }
        const body = (await response.json()) as { items: CustomerProject[] };
        if (cancelled) return;
        setProjects(body.items);
        const nextProjectId = selectedProjectId || body.items[0]?.id || "";
        setSelectedProjectId(nextProjectId);
        setProjectsState("ready");
        setDetailState(nextProjectId ? "loading" : "idle");
        if (!nextProjectId) {
          setProjectDetail(null);
          setSelectedAssetIds([]);
        }
      } catch {
        if (!cancelled) {
          const message = apiNetworkErrorMessage(baseUrl);
          setProjectsState("error");
          setStatus(message);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, selectedProjectId, state, user]);

  useEffect(() => {
    if (state !== "ready" || user?.account_type !== "client" || !selectedProjectId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          if (!cancelled) {
            setDetailState("error");
            setStatus("Session expired. Please sign in again.");
          }
          return;
        }
        const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) {
            const message = `Unable to load selection gallery (${response.status})`;
            setDetailState("error");
            setStatus(message);
          }
          return;
        }
        const body = (await response.json()) as ProjectDetail;
        if (cancelled) return;
        setProjectDetail(body);
        setSelectedAssetIds(body.selection.draft_asset_ids || []);
        setDetailState("ready");
      } catch {
        if (!cancelled) {
          const message = apiNetworkErrorMessage(baseUrl);
          setDetailState("error");
          setStatus(message);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, selectedProjectId, state, user]);

  function toggleAsset(assetId: string) {
    setSelectedAssetIds((current) => (current.includes(assetId) ? current.filter((item) => item !== assetId) : [...current, assetId]));
  }

  async function refreshSelectedProject() {
    if (!selectedProjectId) return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) return;
    const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const body = (await response.json()) as ProjectDetail;
    setProjectDetail(body);
    setSelectedAssetIds(body.selection.draft_asset_ids || []);
    setDetailState("ready");
  }

  async function refreshProjects() {
    const token = await ensureAccessToken(baseUrl);
    if (!token) return;
    const response = await fetch(`${baseUrl}/auth/customer/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { items: CustomerProject[] };
    setProjects(body.items);
  }

  async function saveDraft() {
    if (!selectedProjectId || !canSelect) return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setStatus("Session expired. Please sign in again.");
      return;
    }
    setSavingDraft(true);
    setStatus("");
    setSuccessMessage("");
    try {
      const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}/selection/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ asset_ids: selectedAssetIds }),
      });
      if (!response.ok) {
        const message = await parseError(response, `Draft save failed (${response.status})`);
        setStatus(message);
        toast.error("Draft not saved", { description: message });
        return;
      }
      toast.success("Draft saved", { description: "You can keep reviewing before final submit." });
      setSuccessMessage("Draft saved. Keep reviewing until you are ready to lock the final picks.");
      await refreshSelectedProject();
      await refreshProjects();
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setStatus(message);
      toast.error("Cannot reach the API", { description: message });
    } finally {
      setSavingDraft(false);
    }
  }

  async function submitSelection() {
    if (!selectedProjectId || !canSelect) return;
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setStatus("Session expired. Please sign in again.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    setSuccessMessage("");
    try {
      const response = await fetch(`${baseUrl}/auth/projects/${selectedProjectId}/selection/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await parseError(response, `Final submit failed (${response.status})`);
        setStatus(message);
        toast.error("Submission failed", { description: message });
        return;
      }
      toast.success("Selection submitted", { description: "Your studio team can now review the final picks." });
      setSuccessMessage("Final picks submitted. Your studio team can now move into the next delivery step.");
      await refreshSelectedProject();
      await refreshProjects();
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setStatus(message);
      toast.error("Cannot reach the API", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") return <main className="p-6">Loading studio...</main>;
  if (state === "unauthorized") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl p-6">
        <EmptyState
          title="Session required"
          detail="Please sign in to review your selection galleries."
          cta={<Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/login">Go to sign in</Link>}
        />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (user?.account_type !== "client") return <main className="p-6"><ErrorState detail="This selection studio view is available only for invited clients." /></main>;

  return (
    <AppShell
      roles={user?.roles || []}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type}
      userLabel={user?.username || user?.email || "Client"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={user?.studio?.name || user?.workspace?.name}
    >
      <div className="space-y-6">
        <PageHeader eyebrow="Client Gallery" title="Selections" subtitle="Review the delivered gallery, save draft picks, and submit your final selection when you are ready." />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Projects" value={projects.length} hint="Assigned client galleries" />
          <StatTile label="Draft picks" value={selectedAssetIds.length} hint="Current local selection state" />
          <StatTile label="Submitted" value={projectDetail?.selection.submissions.length || 0} hint="Final submissions for this gallery" />
        </div>

        <SectionCard title="Assigned galleries" subtitle="Only project galleries explicitly granted to your account appear here.">
          {projectsState === "loading" ? (
            <LoadingSkeleton lines={3} />
          ) : projectsState === "error" ? (
            <ErrorState detail={status || "Unable to load galleries."} />
          ) : projects.length === 0 ? (
            <EmptyState title="No galleries yet" detail="Your studio team has not granted any project gallery access yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                    className={active ? "overflow-hidden rounded-[24px] border border-primary bg-primary/5 p-4 text-left transition" : "overflow-hidden rounded-[24px] border border-border bg-background p-4 text-left transition hover:bg-accent hover:text-accent-foreground"}
                  >
                    <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                      {project.cover_preview_url ? (
                        <img src={project.cover_preview_url} alt={project.name} className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent)] px-4 text-center text-xs text-muted-foreground">
                          This gallery will show a cover image once the studio uploads it.
                        </div>
                      )}
                    </div>
                    <p className="font-medium">{project.name}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{project.asset_count} assets · {project.status}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{project.latest_submission_at ? `Submitted ${new Date(project.latest_submission_at).toLocaleString()}` : project.selection_status === "invited" ? "Draft or review in progress" : "Awaiting final submission"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title={projectDetail?.project.name || "Selection studio view"} subtitle="Draft selections stay editable until you confirm the final submission.">
          {detailState === "loading" ? (
            <LoadingSkeleton lines={6} />
          ) : detailState === "error" ? (
            <ErrorState detail={status || "Unable to load gallery details."} />
          ) : !projectDetail ? (
            <EmptyState title="Select a gallery" detail="Choose a project above to review and submit client selections." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{projectDetail.assets.length} assets ready for review</p>
                  <p className="text-xs text-muted-foreground">
                    {projectDetail.selection.submissions.length > 0 ? `Last submitted on ${new Date(projectDetail.selection.submissions[0].submitted_at).toLocaleString()}` : "No final submission yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={saveDraft} disabled={savingDraft || !canSelect}>
                    {savingDraft ? <Spinner /> : null}
                    <span>{savingDraft ? "Saving..." : "Save draft"}</span>
                  </Button>
                  <Button type="button" onClick={submitSelection} disabled={submitting || !canSelect || selectedAssetIds.length === 0}>
                    {submitting ? <Spinner /> : null}
                    <span>{submitting ? "Submitting..." : "Submit final picks"}</span>
                  </Button>
                </div>
              </div>

              {projectDetail.assets.length === 0 ? (
                <EmptyState title="Gallery not ready" detail="Your studio team has not uploaded assets for this project yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {projectDetail.assets.map((asset) => {
                    const checked = selectedAssetIds.includes(asset.id);
                    return (
                      <label key={asset.id} className={checked ? "flex cursor-pointer flex-col gap-3 rounded-xl border border-primary bg-primary/5 p-4 transition" : "flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-accent"}>
                        {asset.preview_url ? (
                          <img src={asset.preview_url} alt={asset.file_name} className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted text-xs text-muted-foreground">
                            Preview available when storage is configured
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{asset.file_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{asset.id.slice(0, 8)}</p>
                          </div>
                          <input type="checkbox" checked={checked} onChange={() => toggleAsset(asset.id)} className="mt-1 size-4 rounded border-border text-primary focus:ring-ring/60" />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {successMessage ? <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p> : null}
          {status ? <p className="mt-4 text-sm text-muted-foreground">{status}</p> : null}
        </SectionCard>
      </div>
      {projectDetail ? (
        <div className="fixed inset-x-3 bottom-3 z-30 flex gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur lg:hidden">
          <Button type="button" variant="outline" className="min-h-12 flex-1 rounded-full" onClick={saveDraft} disabled={savingDraft || !canSelect}>
            {savingDraft ? "Saving..." : "Save draft"}
          </Button>
          <Button type="button" className="min-h-12 flex-1 rounded-full" onClick={submitSelection} disabled={submitting || !canSelect || selectedAssetIds.length === 0}>
            {submitting ? "Submitting..." : "Submit picks"}
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
