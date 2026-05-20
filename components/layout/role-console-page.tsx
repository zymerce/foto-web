"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionList, EmptyState, ErrorState, PageHeader, SectionCard } from "@/components/ui/primitives";
import { hasRole, isPlatformUser } from "@/lib/session";
import { useAuthUser } from "@/lib/use-auth-user";

export function RoleConsolePage({
  title,
  subtitle,
  role,
  allowAdmin = true,
  allowSuperAdmin = true,
  accountType,
  actions,
  extra,
  shellMode,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  role?: string;
  allowAdmin?: boolean;
  allowSuperAdmin?: boolean;
  accountType?: "client" | "studio" | "platform";
  actions: { href: string; label: string; hint?: string }[];
  extra?: ReactNode;
  shellMode?: "platform" | "studio";
  eyebrow?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const { state, detail, user } = useAuthUser(baseUrl);

  if (state === "loading") return <main className="p-6">Loading...</main>;
  if (state === "unauthorized") {
    return <main className="p-6"><EmptyState title="Session required" detail="Please sign in to access this section." cta={<Link href="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to sign in</Link>} /></main>;
  }
  if (state === "error") return <main className="p-6"><ErrorState detail={detail} /></main>;

  const roles = user?.roles || [];
  const resolvedShellMode = shellMode || (isPlatformUser(user) ? "platform" : "studio");
  const allowedByRole = role
    ? (
        hasRole(user, role) ||
        (allowAdmin && hasRole(user, "admin")) ||
        (allowSuperAdmin && hasRole(user, "super_admin"))
      )
    : true;
  const allowedByType = accountType ? user?.account_type === accountType : true;
  const allowedByScope = resolvedShellMode === "platform" ? isPlatformUser(user) : !isPlatformUser(user);

  if (!allowedByRole || !allowedByType || !allowedByScope) {
    return <main className="p-6"><ErrorState detail="Forbidden: you don't have access to this console." /></main>;
  }

  return (
    <AppShell
      roles={roles}
      permissions={user?.permissions}
      isSuperAdmin={user?.is_super_admin}
      accountType={user?.account_type}
      userLabel={user?.username || user?.email || "Member"}
      env={process.env.NEXT_PUBLIC_APP_ENV || "local"}
      workspaceName={user?.studio?.name || user?.workspace?.name}
      shellMode={resolvedShellMode}
    >
      <div className="space-y-6">
        <PageHeader eyebrow={eyebrow || (resolvedShellMode === "platform" ? "Platform Console" : "Studio Console")} title={title} subtitle={subtitle} />
        <SectionCard title="Actions" subtitle="Primary tasks for this role">
          <ActionList items={actions} />
        </SectionCard>
        {extra ? <SectionCard title="Context">{extra}</SectionCard> : null}
      </div>
    </AppShell>
  );
}
