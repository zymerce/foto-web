"use client";

import Link from "next/link";
import { LifeBuoy, MailCheck, Search, ShieldCheck, TriangleAlert, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type SupportEscalation = {
  id: string;
  action_type: string;
  reason: string;
  priority: string;
  status: string;
  created_at: string;
};

type SupportActivity = {
  id: string;
  actor_user_id: string;
  action: string;
  target: string | null;
  reason: string | null;
  outcome: string;
  created_at: string;
};

const quickActions = [
  {
    href: "/app/platform/support/user-lookup",
    label: "User lookup",
    detail: "Inspect access blockers, session health, and diagnostics for one account.",
    icon: UserRoundSearch,
  },
  {
    href: "/app/platform/support/studio-lookup",
    label: "Studio lookup",
    detail: "Open one studio's plan, storage, projects, and ownership context.",
    icon: Search,
  },
  {
    href: "/app/platform/support/recovery-actions",
    label: "Recovery actions",
    detail: "Run bounded support actions like resend, verify, or revoke sessions.",
    icon: MailCheck,
  },
  {
    href: "/app/platform/support/escalations",
    label: "Escalations",
    detail: "Route risky or cross-boundary problems through the audited escalation path.",
    icon: ShieldCheck,
  },
];

export function PlatformSupportConsole() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [escalations, setEscalations] = useState<SupportEscalation[]>([]);
  const [activity, setActivity] = useState<SupportActivity[]>([]);
  const [pageState, setPageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!user || !(hasRole(user, "support") || hasRole(user, "super_admin"))) return;
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
        const [escalationResponse, activityResponse] = await Promise.all([
          fetch(`${baseUrl}/auth/support/escalations`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${baseUrl}/auth/support/activity`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!escalationResponse.ok) {
          throw new Error(await parseError(escalationResponse, `Support queue failed (${escalationResponse.status})`));
        }
        if (!activityResponse.ok) {
          throw new Error(await parseError(activityResponse, `Support activity failed (${activityResponse.status})`));
        }
        const escalationBody = (await escalationResponse.json()) as { items: SupportEscalation[] };
        const activityBody = (await activityResponse.json()) as { items: SupportActivity[] };
        if (cancelled) return;
        setEscalations(escalationBody.items);
        setActivity(activityBody.items);
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
  }, [baseUrl, user]);

  if (state === "loading") return <main className="p-6">Loading support desk...</main>;
  if (state === "unauthorized") {
    return (
      <main className="p-6">
        <EmptyState title="Session required" detail="Please sign in to access support operations." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user || !(hasRole(user, "support") || hasRole(user, "super_admin"))) {
    return <main className="p-6"><ErrorState detail="Support access required." /></main>;
  }

  return (
    <AppShell
      roles={user.roles}
      permissions={user.permissions}
      isSuperAdmin={user.is_super_admin}
      accountType={user.account_type}
      userLabel={user.username || user.email || "Support"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      shellMode="platform"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Support"
          title="Support Desk"
          subtitle="One real support surface for lookup, bounded recovery work, and escalation follow-through."
        />

        <SectionCard title="Quick actions" subtitle="Open the tools a support operator actually uses in V1.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30 hover:bg-accent/40">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        {pageState === "loading" || pageState === "idle" ? (
          <LoadingSkeleton lines={8} />
        ) : pageState === "error" ? (
          <ErrorState detail={feedback || "Unable to load support activity."} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionCard title="Recent escalations" subtitle="The newest escalations raised through the support recovery flow.">
              <div className="space-y-3">
                {escalations.length === 0 ? <EmptyState title="No escalations yet" detail="Support escalations will appear here when an issue needs admin or super-admin intervention." /> : null}
                {escalations.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.action_type.replaceAll("_", " ")}</p>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.priority}</span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{item.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Opened {new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent recovery actions" subtitle="A real trail of support work already executed through bounded platform actions.">
              <div className="space-y-3">
                {activity.length === 0 ? <EmptyState title="No recovery actions yet" detail="Resent invites, verification resets, and session revocations will appear here once support starts using them." /> : null}
                {activity.slice(0, 10).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {item.outcome === "success" ? <LifeBuoy className="size-4" /> : <TriangleAlert className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{item.action.replace("support.", "").replaceAll("_", " ")}</p>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.outcome}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.reason || "Support recovery action"}{item.target ? ` · target ${item.target}` : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">Logged {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}
