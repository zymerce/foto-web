"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage } from "@/lib/api-client";
import { ensureAccessToken } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type UploadSessionItem = {
  id: string;
  project_id: string;
  files_total: number;
  uploaded_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export default function UploadsPage() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [items, setItems] = useState<UploadSessionItem[]>([]);
  const [uploadsState, setUploadsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (state !== "ready") return;
    const run = async () => {
      setUploadsState("loading");
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          setUploadsState("error");
          setStatus("Session expired. Please sign in again.");
          return;
        }
        const response = await fetch(`${baseUrl}/auth/uploads`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setUploadsState("error");
          setStatus(`Unable to load upload sessions (${response.status})`);
          return;
        }
        const body = (await response.json()) as { items: UploadSessionItem[] };
        setItems(body.items);
        setUploadsState("ready");
      } catch {
        setUploadsState("error");
        setStatus(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [baseUrl, state]);

  if (state === "loading") return <main className="p-6">Loading studio...</main>;
  if (state === "unauthorized") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl p-6">
        <EmptyState
          title="Session required"
          detail="Please sign in to review helper upload activity."
          cta={
            <Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/login">
              Go to sign in
            </Link>
          }
        />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;

  const totalFiles = items.reduce((sum, item) => sum + item.files_total, 0);
  const totalUploaded = items.reduce((sum, item) => sum + item.uploaded_count, 0);
  const totalFailed = items.reduce((sum, item) => sum + item.failed_count, 0);

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
          eyebrow="Uploads"
          title="Helper upload operations"
          subtitle="Track direct-to-storage upload sessions, failures, and completion state across active projects."
          actions={
            <Link href="/app/projects" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Open projects
            </Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Sessions" value={items.length} hint="Recent helper sessions" />
          <StatTile label="Uploaded" value={totalUploaded} hint={`${totalFiles} files across visible sessions`} />
          <StatTile label="Failed" value={totalFailed} hint="Files that need retry or review" />
        </div>

        <SectionCard title="Recent sessions" subtitle="Uploads are scoped to connected helper devices and assigned project access.">
          {uploadsState === "loading" ? (
            <LoadingSkeleton lines={5} />
          ) : uploadsState === "error" ? (
            <ErrorState detail={status || "Unable to load uploads."} />
          ) : items.length === 0 ? (
            <EmptyState title="No uploads yet" detail="Create a project and launch Helper to start syncing image folders." />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Project {item.project_id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Started {new Date(item.created_at).toLocaleString()}
                        {item.completed_at ? ` · Completed ${new Date(item.completed_at).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{item.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Files</p>
                      <p className="mt-2 text-xl font-semibold">{item.files_total}</p>
                    </div>
                    <div className="rounded-lg border border-border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Uploaded</p>
                      <p className="mt-2 text-xl font-semibold">{item.uploaded_count}</p>
                    </div>
                    <div className="rounded-lg border border-border px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failed</p>
                      <p className="mt-2 text-xl font-semibold">{item.failed_count}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
