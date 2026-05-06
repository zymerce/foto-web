import Image from "next/image";

type ApiHealth = {
  status: string;
};

async function getApiStatus(baseUrl: string): Promise<{ state: "ok" | "unreachable"; detail: string }> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { state: "unreachable", detail: `HTTP ${response.status}` };
    }
    const body = (await response.json()) as ApiHealth;
    if (body.status === "ok") {
      return { state: "ok", detail: "API healthy" };
    }
    return { state: "unreachable", detail: "Unexpected response" };
  } catch {
    return { state: "unreachable", detail: "API not reachable" };
  }
}

export default async function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const apiStatus = await getApiStatus(apiBase);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="w-full rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">API Base URL</p>
          <p className="text-sm break-all text-zinc-900 dark:text-zinc-100">{apiBase}</p>
          <p className="mt-2 text-sm font-semibold">
            API status: {apiStatus.state === "ok" ? "ok" : "unreachable"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{apiStatus.detail}</p>
        </div>
      </main>
    </div>
  );
}
