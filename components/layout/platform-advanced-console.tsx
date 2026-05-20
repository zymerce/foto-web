"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";
import { ensureAccessToken, hasRole } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

type Announcement = {
  enabled: boolean;
  message: string | null;
  tone: "info" | "warning" | "success";
  expires_at: string | null;
};

export function PlatformAdvancedConsole() {
  const baseUrl = apiBaseUrl();
  const { state, detail, user } = useAuthUser(baseUrl);
  const [pageState, setPageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement>({ enabled: false, message: "", tone: "info", expires_at: null });

  useEffect(() => {
    if (state !== "ready" || !user || !hasRole(user, "super_admin")) return;
    let cancelled = false;
    const run = async () => {
      setPageState("loading");
      const token = await ensureAccessToken(baseUrl);
      if (!token) {
        if (!cancelled) {
          setPageState("error");
          setFeedback("Session expired. Please sign in again.");
        }
        return;
      }
      try {
        const response = await fetch(`${baseUrl}/auth/platform/announcement`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(await parseError(response, `Announcement load failed (${response.status})`));
        }
        const body = (await response.json()) as { announcement: Announcement };
        if (!cancelled) {
          setAnnouncement(body.announcement);
          setPageState("ready");
        }
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

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const token = await ensureAccessToken(baseUrl);
    if (!token) {
      setFeedback("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/platform/announcement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) {
        const message = await parseError(response, `Announcement save failed (${response.status})`);
        setFeedback(message);
        toast.error("Announcement update failed", { description: message });
        return;
      }
      const body = (await response.json()) as { announcement: Announcement };
      setAnnouncement(body.announcement);
      setFeedback("Announcement updated.");
      toast.success("Announcement updated", { description: "Authenticated users will see the new banner." });
    } catch {
      const message = apiNetworkErrorMessage(baseUrl);
      setFeedback(message);
      toast.error("Cannot reach the API", { description: message });
    }
  }

  if (state === "loading") return <main className="p-6">Loading advanced controls...</main>;
  if (state === "unauthorized") {
    return <main className="p-6"><EmptyState title="Session required" detail="Please sign in to access advanced platform controls." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} /></main>;
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;
  if (!user || !hasRole(user, "super_admin")) return <main className="p-6"><ErrorState detail="Super admin access required." /></main>;

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
          eyebrow="Advanced"
          title="Advanced governance and communication"
          subtitle="Keep platform-critical controls available without making them the default owner workflow."
        />

        {pageState === "loading" || pageState === "idle" ? <LoadingSkeleton lines={6} /> : null}
        {pageState === "error" ? <ErrorState detail={feedback || "Unable to load advanced controls."} /> : null}

        {pageState === "ready" ? (
          <>
            <SectionCard title="Global Announcement Banner" subtitle="Broadcast a temporary message across authenticated app surfaces.">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveAnnouncement}>
                <div className="md:col-span-2">
                  <Label htmlFor="announcement-message">Message</Label>
                  <Input
                    id="announcement-message"
                    className="mt-2"
                    value={announcement.message || ""}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Uploads will be paused Sunday 2:00 AM to 2:15 AM IST."
                  />
                </div>
                <div>
                  <Label htmlFor="announcement-tone">Tone</Label>
                  <select
                    id="announcement-tone"
                    className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={announcement.tone}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, tone: event.target.value as Announcement["tone"] }))}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="announcement-expiry">Expires at</Label>
                  <Input
                    id="announcement-expiry"
                    className="mt-2"
                    type="datetime-local"
                    value={announcement.expires_at ? announcement.expires_at.slice(0, 16) : ""}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, expires_at: event.target.value ? new Date(event.target.value).toISOString() : null }))}
                  />
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 py-3 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={announcement.enabled}
                    onChange={(event) => setAnnouncement((current) => ({ ...current, enabled: event.target.checked }))}
                  />
                  <span className="text-sm font-medium">Show banner across authenticated app surfaces</span>
                </label>
                <div className="md:col-span-2">
                  <Button type="submit">Save announcement</Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Governance Links" subtitle="Keep emergency and audit controls out of the main navigation, but still reachable when needed.">
              <div className="flex flex-wrap gap-2">
                <Link href="/app/platform/policies" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">Policies</Link>
                <Link href="/app/platform/security" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">Emergency controls</Link>
                <Link href="/app/platform/audit" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">Audit stream</Link>
                <Link href="/app/platform/admin-governance" className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent">Admin governance</Link>
              </div>
            </SectionCard>
          </>
        ) : null}

        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </div>
    </AppShell>
  );
}
