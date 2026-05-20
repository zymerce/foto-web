"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, FolderKanban, LifeBuoy, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type PlatformOverview = {
  studios_total: number;
  paid_studios: number;
  plan_mix: Record<string, number>;
  total_storage_gb: number;
  active_upload_sessions: number;
  active_browser_sessions: number;
  open_escalations: number;
  failed_upload_sessions_24h: number;
  helper_active_24h: number;
  uploads_started_24h: number;
};

type SupportQueue = {
  id: string;
  action_type: string;
  priority: string;
  status: string;
  reason: string;
  created_at: string;
};

export function PlatformHomeConsole() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [supportItems, setSupportItems] = useState<SupportQueue[]>([]);
  const [pageState, setPageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (state !== "ready" || !user || !(hasRole(user, "super_admin") || hasRole(user, "support"))) return;
    let cancelled = false;
    const run = async () => {
      setPageState("loading");
      setFeedback("");
      const token = await ensureAccessToken(baseUrl);
      if (!token) {
        if (!cancelled) {
          setPageState("error");
          setFeedback("Session expired. Please sign in again.");
        }
        return;
      }
      try {
        const requests: Promise<Response>[] = [
          fetch(`${baseUrl}/auth/platform/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        if (hasRole(user, "support")) {
          requests.push(fetch(`${baseUrl}/auth/support/escalations`, { headers: { Authorization: `Bearer ${token}` } }));
        } else {
          requests.push(fetch(`${baseUrl}/auth/admin/escalations`, { headers: { Authorization: `Bearer ${token}` } }));
        }
        const [overviewResponse, queueResponse] = await Promise.all(requests);
        if (!overviewResponse.ok) {
          throw new Error(await parseError(overviewResponse, `Platform overview failed (${overviewResponse.status})`));
        }
        if (!queueResponse.ok) {
          throw new Error(await parseError(queueResponse, `Support queue failed (${queueResponse.status})`));
        }
        const overviewBody = (await overviewResponse.json()) as { overview: PlatformOverview };
        const queueBody = (await queueResponse.json()) as { items: SupportQueue[] };
        if (cancelled) return;
        setOverview(overviewBody.overview);
        setSupportItems(queueBody.items.slice(0, 5));
        setPageState("ready");
      } catch (error) {
        if (!cancelled) {
          setPageState("error");
          setFeedback(error instanceof Error ? error.message : apiNetworkErrorMessage(baseUrl));
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, state, user]);

  const planMix = useMemo(() => {
    if (!overview) return [];
    return Object.entries(overview.plan_mix).sort((a, b) => a[0].localeCompare(b[0]));
  }, [overview]);

  if (state === "loading") return <main className="p-6">Loading platform...</main>;
  if (state === "unauthorized") {
    return (
      <main className="p-6">
        <EmptyState title="Session required" detail="Please sign in to access platform operations." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user || !(hasRole(user, "super_admin") || hasRole(user, "support"))) {
    return <main className="p-6"><ErrorState detail="Platform operations access required." /></main>;
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
          eyebrow="Platform Home"
          title={hasRole(user, "super_admin") ? "Run fotoz.io from one founder-ops surface" : "Support the product without leaving the platform lane"}
          subtitle="Studios, paid plan mix, live sessions, upload pressure, and support load now live in one real operating view."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/app/platform/studios" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
                Open studios <ArrowRight className="size-4" />
              </Link>
              <Link href="/app/platform/users" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent">
                Open users
              </Link>
            </div>
          }
        />

        {pageState === "loading" || pageState === "idle" ? <LoadingSkeleton lines={8} /> : null}
        {pageState === "error" ? <ErrorState detail={feedback || "Unable to load platform overview."} /> : null}

        {pageState === "ready" && overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Studios" value={overview.studios_total} hint={`${overview.paid_studios} on paid plans`} />
              <StatTile label="Storage" value={`${overview.total_storage_gb} GB`} hint="Summed from uploaded gallery assets" />
              <StatTile label="Active browser sessions" value={overview.active_browser_sessions} hint="Refresh-token backed live sessions" />
              <StatTile label="Active uploads" value={overview.active_upload_sessions} hint={`${overview.helper_active_24h} helper devices seen in 24h`} />
            </div>

            <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
              <SectionCard title="Business Pulse" subtitle="The operating numbers that matter before you open another dashboard tab.">
                <div className="grid gap-3 md:grid-cols-2">
                  <Link href="/app/platform/studios" className="rounded-2xl border border-border bg-background p-4 transition hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FolderKanban className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">Plan mix</p>
                        <p className="text-sm text-muted-foreground">{planMix.map(([key, count]) => `${key}: ${count}`).join(" · ") || "No studios yet"}</p>
                      </div>
                    </div>
                  </Link>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Wallet className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">Paid momentum</p>
                        <p className="text-sm text-muted-foreground">{overview.paid_studios} paying studio{overview.paid_studios === 1 ? "" : "s"} out of {overview.studios_total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Activity className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">Upload pressure</p>
                        <p className="text-sm text-muted-foreground">{overview.uploads_started_24h} sessions started · {overview.failed_upload_sessions_24h} with failures in 24h</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <LifeBuoy className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold">Support pressure</p>
                        <p className="text-sm text-muted-foreground">{overview.open_escalations} open escalation{overview.open_escalations === 1 ? "" : "s"} platform-wide</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Support Queue" subtitle="Recent recovery and escalation workload from the real support surface.">
                <div className="space-y-3">
                  {supportItems.length === 0 ? <p className="text-sm text-muted-foreground">No recent support items.</p> : null}
                  {supportItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold">{item.action_type} · {item.priority} · {item.status}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Link href="/app/platform/support/user-lookup" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">
                      User lookup
                    </Link>
                    <Link href="/app/platform/support/escalations" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">
                      Escalations
                    </Link>
                    {hasRole(user, "super_admin") ? (
                      <Link href="/app/platform/advanced" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">
                        Advanced
                      </Link>
                    ) : null}
                  </div>
                </div>
              </SectionCard>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
