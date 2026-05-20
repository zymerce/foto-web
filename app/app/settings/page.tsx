"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard, FolderKanban, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageHeader, SectionCard, StatTile } from "@/components/ui/primitives";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, parseError } from "@/lib/api-client";
import { ensureAccessToken, isPlatformUser } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: () => void;
      theme: { color: string };
    }) => { open: () => void };
  }
}

type BillingInfo = {
  current_plan: string;
  projects_used: number;
  projects_limit: number | null;
  storage_used_gb: number;
  storage_limit_gb: number | null;
};

const studioTabs = [
  { key: "profile", label: "Profile" },
  { key: "studio", label: "Studio" },
  { key: "billing", label: "Billing" },
] as const;

const platformTabs = [
  { key: "profile", label: "Profile" },
  { key: "sessions", label: "Sessions" },
] as const;

function SettingsPageContent() {
  const baseUrl = apiBaseUrl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingState, setBillingState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [billingError, setBillingError] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  const platformMode = isPlatformUser(user);
  const tabs = platformMode ? platformTabs : studioTabs;
  const requestedTab = searchParams.get("tab") || "profile";
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : tabs[0].key;

  useEffect(() => {
    if (state !== "ready" || platformMode || activeTab !== "billing") return;
    let cancelled = false;
    const run = async () => {
      setBillingState("loading");
      setBillingError("");
      try {
        const token = await ensureAccessToken(baseUrl);
        if (!token) {
          if (!cancelled) {
            setBillingState("error");
            setBillingError("Session expired. Please sign in again.");
          }
          return;
        }
        const response = await fetch(`${baseUrl}/auth/billing/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(await parseError(response, "Unable to load billing usage"));
        }
        const body = (await response.json()) as BillingInfo;
        if (cancelled) return;
        setBilling(body);
        setBillingState("ready");
      } catch (error) {
        if (!cancelled) {
          setBillingState("error");
          setBillingError(error instanceof Error ? error.message : "Unable to load billing usage.");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, baseUrl, platformMode, state]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const token = await ensureAccessToken(baseUrl);
      const res = await fetch(`${baseUrl}/auth/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_key: "pro" }),
      });

      if (!res.ok) {
        const error = await parseError(res, "Checkout failed");
        throw new Error(error);
      }

      const order = await res.json();
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "fotoz.io",
        description: "Upgrade to Pro Plan",
        order_id: order.order_id,
        handler: function () {
          toast.success("Payment successful", { description: "Your studio plan is refreshing now." });
          window.location.reload();
        },
        theme: { color: "#0f766e" },
      });
      rzp.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment upgrade failed");
    } finally {
      setUpgrading(false);
    }
  };

  if (state === "loading") return <main className="p-6">Loading settings...</main>;
  if (state === "unauthorized") {
    return (
      <main className="p-6">
        <EmptyState title="Session required" detail="Please sign in to view account settings." cta={<Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/login">Go to sign in</Link>} />
      </main>
    );
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;

  const tabButtonClass = (tabKey: string) =>
    activeTab === tabKey
      ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
      : "rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground";

  return (
    <AppShell
      roles={user?.roles || []}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type}
      userLabel={user?.username || user?.email || "Member"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={user?.studio?.name || user?.workspace?.name}
      shellMode={platformMode ? "platform" : "studio"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Settings"
          title={platformMode ? "Operator settings" : "Studio settings"}
          subtitle={platformMode ? "One canonical place for profile context and session posture across platform work." : "Profile, studio, and billing now live together so the studio never has to hunt through multiple menus to find the basics."}
        />

        <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => router.replace(`/app/settings?tab=${tab.key}`)}
              className={tabButtonClass(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "profile" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <SectionCard title="Profile" subtitle={platformMode ? "Your platform-side operator identity." : "The profile identity behind your studio-side work."}>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Email: <span className="text-foreground">{user?.email || "Not set"}</span></p>
                <p>Username: <span className="text-foreground">{user?.username || "Not set"}</span></p>
                <p>Roles: <span className="text-foreground">{user?.roles?.join(", ") || "Not set"}</span></p>
                <p>Scope: <span className="text-foreground">{platformMode ? "Platform" : user?.studio?.name || user?.workspace?.name || "Studio not linked"}</span></p>
              </div>
            </SectionCard>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatTile label="Account type" value={user?.account_type || "unknown"} />
              <StatTile label="Primary role" value={platformMode ? user?.platform_role || user?.roles?.[0] || "operator" : user?.studio_role || user?.roles?.[0] || "member"} />
              <StatTile label="Email status" value={user?.email_verified ? "Verified" : "Pending"} />
              <StatTile label={platformMode ? "Experience" : "Studio"} value={platformMode ? "Platform" : user?.studio?.name || user?.workspace?.name || "Not linked"} />
            </div>
          </div>
        ) : null}

        {!platformMode && activeTab === "studio" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionCard title="Studio identity" subtitle="The customer-facing context photographers and clients see.">
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Studio name: <span className="text-foreground">{user?.studio?.name || user?.workspace?.name || "Not linked"}</span></p>
                <p>Studio slug: <span className="text-foreground">{user?.studio?.slug || user?.workspace?.slug || "Not linked"}</span></p>
                <p>Membership role: <span className="text-foreground">{user?.studio?.membership_role || user?.workspace?.membership_role || "Not linked"}</span></p>
                <p>Projects, Helper connection, and client access continue to flow through the project view so the studio always works from one operational surface.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/app/projects" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <FolderKanban className="size-4" />
                  Open projects
                </Link>
                <Link href="/app/uploads" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground">
                  <ShieldCheck className="size-4" />
                  View upload status
                </Link>
              </div>
            </SectionCard>
            <SectionCard title="Helper readiness" subtitle="Desktop uploads stay project-scoped and studio-safe.">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Helper sessions are issued from real project views using one-time connect flows. The device token is separate from your browser session, which keeps long uploads more stable.</p>
                <p>Use your project detail page when you want to assign people, launch Helper, review upload progress, or generate the lightweight gallery link.</p>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {!platformMode && activeTab === "billing" ? (
          <div className="space-y-6">
            {billingState === "loading" || billingState === "idle" ? (
              <SectionCard title="Billing" subtitle="Loading truthful usage and plan data for this studio.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                </div>
              </SectionCard>
            ) : billingState === "error" ? (
              <ErrorState detail={billingError || "Unable to load billing usage."} />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile label="Current plan" value={billing?.current_plan?.toUpperCase() || "FREE"} />
                  <StatTile label="Projects used" value={`${billing?.projects_used ?? 0} / ${billing?.projects_limit ?? "∞"}`} />
                  <StatTile label="Storage used" value={`${billing?.storage_used_gb ?? 0} GB / ${billing?.storage_limit_gb ?? "∞"} GB`} />
                </div>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <SectionCard title="Billing & subscription" subtitle="A single place to understand your current plan and upgrade when the studio is ready.">
                    <div className="rounded-[28px] border border-border bg-background p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold">{billing?.current_plan === "pro" ? "Pro Studio" : "Free Starter"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{billing?.current_plan === "pro" ? "₹1,499/month" : "₹0/month"}</p>
                        </div>
                        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CreditCard className="size-5" />
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        {billing?.current_plan === "pro"
                          ? "Your studio has the paid plan active. Usage shown here comes from real project and storage totals."
                          : "Free gives you a clean starting point. Upgrade when the studio needs more active projects, more storage, and a stronger delivery rhythm."}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        V1 promise: project-based delivery, Helper-assisted uploads, secure share links, invited private review, and truthful billing.
                      </p>
                      {billing?.current_plan === "free" ? (
                        <Button onClick={handleUpgrade} disabled={upgrading} className="mt-5 min-h-11 rounded-full px-5">
                          {upgrading ? "Processing..." : "Upgrade to Pro"}
                        </Button>
                      ) : null}
                    </div>
                  </SectionCard>
                  <SectionCard title="Included right now" subtitle="Keep the promise narrow, honest, and production-shaped.">
                    <ul className="space-y-3 text-sm">
                      {[
                        "Studio onboarding with project-based delivery",
                        "Helper-assisted upload flow",
                        "Invited client review and selections",
                        "Lightweight secure gallery links",
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                          <Check className="size-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </>
            )}
          </div>
        ) : null}

        {platformMode && activeTab === "sessions" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionCard title="Session posture" subtitle="Platform work stays isolated from studio delivery work by default.">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Your browser session refreshes through the secure cookie flow, while Helper devices use their own scoped credentials for upload work.</p>
                <p>Platform operators do not need studio membership to inspect studios, users, support cases, or audit posture.</p>
              </div>
            </SectionCard>
            <SectionCard title="Current guardrails" subtitle="These are the boundaries this account operates under right now.">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Platform routes stay separate from studio project routes.</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Studio-side billing is hidden for platform-only accounts.</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Support-safe recovery actions remain platform scoped.</li>
              </ul>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="p-6">Loading settings...</main>}>
      <SettingsPageContent />
    </Suspense>
  );
}
