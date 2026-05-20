import { apiNetworkErrorMessage } from "@/lib/api-client";

export type MeUser = {
  id?: string;
  email: string | null;
  username: string | null;
  account_type: string;
  scope?: "platform" | "studio";
  experience_scope?: "platform" | "studio";
  email_verified: boolean;
  roles: string[];
  permissions?: string[];
  is_super_admin?: boolean;
  platform_role?: "super_admin" | "support" | "analyst" | null;
  studio_role?: "admin" | "photographer" | "customer" | null;
  integrity_flags?: string[];
  requires_remediation?: boolean;
  studio?: {
    id: string;
    name: string;
    slug: string;
    membership_role: string;
  } | null;
  announcement?: {
    enabled: boolean;
    message: string | null;
    tone: "info" | "warning" | "success";
    expires_at: string | null;
  } | null;
  view_as?: {
    active: boolean;
    read_only: boolean;
    actor_user_id: string | null;
    actor_email: string | null;
    actor_username?: string | null;
    target_user_id: string;
    expires_at: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
    membership_role: string;
    plan_key?: string;
  } | null;
};

const USER_CACHE_KEY = "foto_user_snapshot";
let memoryAccessToken = "";
let refreshInFlight: Promise<string | null> | null = null;

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function readCachedUser(): MeUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MeUser;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: MeUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // best-effort cache only
  }
}

export function clearCachedUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // best-effort cache only
  }
}

export function storeAccessToken(accessToken: string): void {
  memoryAccessToken = accessToken;
}

export function currentAccessToken(): string {
  return memoryAccessToken;
}

export function csrfTokenCookie(): string {
  return readCookie("csrf_token");
}

export function clearSession(): void {
  memoryAccessToken = "";
  clearCachedUser();
}

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const csrfToken = csrfTokenCookie();
    if (!csrfToken) return null;
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (!response.ok) {
        clearSession();
        return null;
      }
      const body = (await response.json()) as { access_token?: string };
      memoryAccessToken = body.access_token || "";
      return memoryAccessToken || null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function ensureAccessToken(baseUrl: string): Promise<string> {
  if (memoryAccessToken) return memoryAccessToken;
  return (await refreshAccessToken(baseUrl)) || "";
}

export async function fetchMe(baseUrl: string): Promise<{ ok: boolean; user?: MeUser; status: number; detail?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, status: 500 };
  }
  let token = await ensureAccessToken(baseUrl);
  if (!token) return { ok: false, status: 401 };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, status: 0, detail: apiNetworkErrorMessage(baseUrl) };
  }

  if (response.status === 401) {
    memoryAccessToken = "";
    token = await refreshAccessToken(baseUrl) || "";
    if (!token) return { ok: false, status: 401 };
    try {
      response = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return { ok: false, status: 0, detail: apiNetworkErrorMessage(baseUrl) };
    }
  }

  if (!response.ok) return { ok: false, status: response.status };
  const body = (await response.json()) as { user: MeUser };
  writeCachedUser(body.user);
  return { ok: true, user: body.user, status: 200 };
}

export function hasRole(user: MeUser | null, role: string): boolean {
  return !!user?.roles?.includes(role);
}

export function hasPermission(user: MeUser | null, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}

export function isPlatformUser(user: MeUser | null): boolean {
  if (!user) return false;
  return user.scope === "platform" || user.experience_scope === "platform";
}

export async function startHelperConnect(baseUrl: string, projectId: string): Promise<{ ok: boolean; deepLink?: string; detail?: string }> {
  const token = await ensureAccessToken(baseUrl);
  if (!token) return { ok: false, detail: "Please sign in again." };
  const response = await fetch(`${baseUrl}/auth/helper/connect/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string };
    return { ok: false, detail: body.detail || `Helper connect failed (${response.status})` };
  }
  const body = (await response.json()) as { deep_link: string };
  return { ok: true, deepLink: body.deep_link };
}
