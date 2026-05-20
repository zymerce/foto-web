export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export async function parseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  return body.detail || fallback;
}

export function apiNetworkErrorMessage(baseUrl: string): string {
  return `Cannot reach API at ${baseUrl}. Check NEXT_PUBLIC_API_BASE_URL, API server status, and CORS.`;
}
