"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FolderKanban, House, Images, LogOut, Menu, Settings, UploadCloud, User2, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearSession, csrfTokenCookie, readCachedUser } from "@/lib/session";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
  permissions?: string[];
  accountTypes?: string[];
  superAdminOnly?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

const STUDIO_NAV_GROUPS: NavGroup[] = [
  {
    key: "studio",
    label: "Studio",
    items: [
      { href: "/app/home", label: "Studio Home" },
      { href: "/app/projects", label: "Projects", permissions: ["projects:read"] },
      { href: "/app/uploads", label: "Uploads", permissions: ["uploads:read"] },
      { href: "/app/admin/users", label: "Clients & Team", permissions: ["workspace_members:manage"] },
      { href: "/app/activity", label: "Activity", roles: ["photographer", "admin"] },
      { href: "/app/customer/selections", label: "Selections", accountTypes: ["client"] },
      { href: "/app/customer/history", label: "History", accountTypes: ["client"] },
      { href: "/app/settings", label: "Settings" },
    ],
  },
];

const PLATFORM_NAV_GROUPS: NavGroup[] = [
  {
    key: "platform",
    label: "Platform",
    items: [
      { href: "/app/platform/home", label: "Platform Home", roles: ["super_admin", "support"] },
      { href: "/app/platform/studios", label: "Studios", roles: ["super_admin", "support"] },
      { href: "/app/platform/users", label: "Users", roles: ["super_admin", "support"] },
    ],
  },
  {
    key: "support",
    label: "Support",
    items: [
      { href: "/app/platform/support/home", label: "Support Home", roles: ["support", "super_admin"] },
      { href: "/app/platform/support/user-lookup", label: "User Lookup", roles: ["support", "super_admin"] },
      { href: "/app/platform/support/studio-lookup", label: "Studio Lookup", roles: ["support", "super_admin"] },
      { href: "/app/platform/support/recovery-actions", label: "Recovery Actions", roles: ["support", "super_admin"] },
      { href: "/app/platform/support/escalations", label: "Escalations", roles: ["support", "super_admin"] },
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    items: [
      { href: "/app/platform/advanced", label: "Advanced", roles: ["super_admin"] },
    ],
  },
];

function isAllowed(item: NavItem, roles: string[], accountType?: string, permissions?: string[], isSuperAdmin?: boolean) {
  if (item.superAdminOnly && !isSuperAdmin) return false;
  if (item.accountTypes && item.accountTypes.length > 0 && !item.accountTypes.includes(accountType || "")) return false;
  if (item.permissions && item.permissions.length > 0) {
    const bag = new Set(permissions || []);
    if (!item.permissions.every((perm) => bag.has(perm))) return false;
  }
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((role) => roles.includes(role));
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return cn(
    "block rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function AppShell({
  children,
  roles,
  permissions,
  isSuperAdmin,
  accountType,
  userLabel,
  env,
  workspaceName,
  shellMode = "studio",
}: {
  children: ReactNode;
  roles: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  accountType?: string;
  userLabel: string;
  env: string;
  workspaceName?: string | null;
  shellMode?: "studio" | "platform";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const cachedUser = readCachedUser();
  const announcement = cachedUser?.announcement;
  const viewAs = cachedUser?.view_as;
  const navGroups = shellMode === "platform" ? PLATFORM_NAV_GROUPS : STUDIO_NAV_GROUPS;
  const contextLabel =
    shellMode === "platform"
      ? isSuperAdmin
        ? "Platform owner"
        : roles.includes("support")
          ? "Support operator"
          : "Platform operator"
      : workspaceName || userLabel;
  const groups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => isAllowed(item, roles, accountType, permissions, isSuperAdmin)),
      })).filter((group) => group.items.length > 0),
    [navGroups, roles, accountType, permissions, isSuperAdmin],
  );
  const mobileQuickActions = useMemo(() => {
    if (shellMode !== "studio") return [];
    if (accountType === "client") {
      return [
        { href: "/app/home", label: "Home", icon: House },
        { href: "/app/customer/selections", label: "Gallery", icon: Images },
        { href: "/app/customer/history", label: "History", icon: FolderKanban },
        { href: "/app/settings", label: "Settings", icon: Settings },
      ];
    }
    if (roles.includes("admin")) {
      return [
        { href: "/app/home", label: "Home", icon: House },
        { href: "/app/projects", label: "Projects", icon: FolderKanban },
        { href: "/app/uploads", label: "Uploads", icon: UploadCloud },
        { href: "/app/settings?tab=billing", label: "Billing", icon: Wallet },
      ];
    }
    return [
      { href: "/app/home", label: "Home", icon: House },
      { href: "/app/projects", label: "Projects", icon: FolderKanban },
      { href: "/app/uploads", label: "Uploads", icon: UploadCloud },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ];
  }, [accountType, roles, shellMode]);

  useEffect(() => {
    if (!mainScrollRef.current) return;
    mainScrollRef.current.scrollTo({ top: 0, behavior: "auto" });
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const csrfToken = csrfTokenCookie();
      const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      if (csrfToken) {
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        }).catch(() => null);
      }
    } finally {
      clearSession();
      router.push("/login");
      router.refresh();
      setSigningOut(false);
    }
  }

  function exitViewAs() {
    clearSession();
    router.push("/app/platform/home");
    router.refresh();
  }

  return (
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold">fotoz.io</p>
            <p className="truncate text-xs text-muted-foreground">{contextLabel}</p>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{accountType || "studio"}</span>
            <ThemeToggle />
            <span className="text-xs text-muted-foreground">ENV: {env}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-h-11 gap-3 rounded-full pl-2 pr-4">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(userLabel || "U").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-36 truncate">{userLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-semibold">{userLabel}</span>
                  <span className="text-xs font-normal text-muted-foreground">{shellMode === "platform" ? contextLabel : workspaceName || "Studio member"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/app/settings" className="cursor-pointer">
                      <Settings className="size-4" />
                      Account settings
                    </Link>
                  </DropdownMenuItem>
                  {viewAs?.active ? (
                    <DropdownMenuItem onClick={exitViewAs} className="cursor-pointer">
                      <User2 className="size-4" />
                      Exit view-as
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw,24rem)] overflow-y-auto px-4 pb-6 pt-5">
              <SheetHeader>
                <SheetTitle>{shellMode === "platform" ? "Platform navigation" : "Studio navigation"}</SheetTitle>
                <SheetDescription>
                  {shellMode === "platform"
                    ? "Browse your role-based routes, account settings, and platform operations."
                    : "Browse your role-based routes, account settings, and studio actions."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">{userLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{shellMode === "platform" ? contextLabel : workspaceName || accountType || "studio"}</p>
              </div>
              <div className="mt-4">
                <ThemeToggle compact />
              </div>
              <nav className="mt-5 space-y-4" aria-label="Mobile navigation">
                {groups.map((group) => (
                  <div key={group.key} className="space-y-1">
                    <p className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
                    {group.items.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link href={item.href} className={navLinkClass(isActive(pathname, item.href))}>
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                ))}
              </nav>
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <SheetClose asChild>
                  <Link href="/app/settings" className={navLinkClass(isActive(pathname, "/app/settings"))}>
                    <User2 className="inline-block size-4 align-middle" /> <span className="align-middle">Account settings</span>
                  </Link>
                </SheetClose>
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={signOut}>
                  <LogOut className="size-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex h-dvh w-full pt-14">
        <aside className="fixed bottom-0 left-0 top-14 hidden w-72 overflow-y-auto border-r border-border bg-card lg:flex lg:flex-col">
          <div className="border-b border-border px-4 py-4">
            <p className="text-sm font-semibold">fotoz.io</p>
            <p className="mt-1 text-xs text-muted-foreground">{contextLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">ENV: {env}</p>
          </div>
          <nav className="space-y-5 px-4 py-4" aria-label="Primary navigation">
            {groups.map((group) => (
              <div key={group.key} className="space-y-1">
                <p className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className={navLinkClass(isActive(pathname, item.href))}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div ref={mainScrollRef} className="min-w-0 flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:ml-72 lg:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <main id="main-content" className="w-full px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1220px] space-y-4">
              {announcement?.enabled && announcement.message ? (
                <section
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm shadow-sm",
                    announcement.tone === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                      : announcement.tone === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                        : "border-primary/20 bg-primary/10 text-foreground",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{announcement.message}</p>
                    {announcement.expires_at ? (
                      <span className="text-xs opacity-80">Ends {new Date(announcement.expires_at).toLocaleString()}</span>
                    ) : null}
                  </div>
                </section>
              ) : null}
              {viewAs?.active ? (
                <section className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">
                      Viewing as {userLabel} in read-only mode.
                      {viewAs.actor_email ? ` Signed in as ${viewAs.actor_email}.` : ""}
                    </p>
                    <Button variant="outline" size="sm" onClick={exitViewAs}>
                      Exit view-as
                    </Button>
                  </div>
                </section>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>

      {shellMode === "studio" && mobileQuickActions.length > 0 ? (
        <nav
          aria-label="Quick actions"
          className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur lg:hidden"
        >
          {mobileQuickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition",
                  isActive(pathname, item.href.split("?")[0])
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
