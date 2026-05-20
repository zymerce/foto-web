"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage } from "@/lib/api-client";
import { ensureAccessToken } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type SelectionHistoryItem = {
  id: string;
  project_id: string;
  selected_asset_ids: string[];
  submitted_at: string;
};

export default function CustomerHistoryPage() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [items, setItems] = useState<SelectionHistoryItem[]>([]);
  const [historyState, setHistoryState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (state !== "ready" || user?.account_type !== "client") return;
    const run = async () => {
      setHistoryState("loading");
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          setHistoryState("error");
          setStatus("Session expired. Please sign in again.");
          return;
        }
        const response = await fetch(`${baseUrl}/auth/customer/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setHistoryState("error");
          setStatus(`Unable to load selection history (${response.status})`);
          return;
        }
        const body = (await response.json()) as { items: SelectionHistoryItem[] };
        setItems(body.items);
        setHistoryState("ready");
      } catch {
        setHistoryState("error");
        setStatus(apiNetworkErrorMessage(baseUrl));
      }
    };
    void run();
  }, [baseUrl, state, user]);

  if (state === "loading") return <main className="p-6">Loading studio...</main>;
  if (state === "unauthorized") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl p-6">
        <EmptyState
          title="Session required"
          detail="Please sign in to review your submission history."
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
  if (user?.account_type !== "client") return <main className="p-6"><ErrorState detail="Selection history is available only for invited client accounts." /></main>;

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
        <PageHeader
          eyebrow="Client History"
          title="Selection history"
          subtitle="Track every final submission you have sent back to the studio team."
          actions={
            <Button asChild>
              <Link href="/app/customer/selections">Open current selections</Link>
            </Button>
          }
        />

        <SectionCard title="Submitted selections" subtitle="This feed shows finalized selection handoffs only.">
          {historyState === "loading" ? (
            <LoadingSkeleton lines={5} />
          ) : historyState === "error" ? (
            <ErrorState detail={status || "Unable to load history."} />
          ) : items.length === 0 ? (
            <EmptyState title="No submissions yet" detail="When you submit a final gallery selection, the record will appear here." />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Project {item.project_id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted on {new Date(item.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.selected_asset_ids.length} selected assets</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.selected_asset_ids.map((assetId) => (
                      <span key={assetId} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        {assetId.slice(0, 8)}
                      </span>
                    ))}
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
