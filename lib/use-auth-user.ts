"use client";

import { useEffect, useState } from "react";
import { clearCachedUser, fetchMe, readCachedUser, type MeUser } from "@/lib/session";

export function useAuthUser(baseUrl: string) {
  const cachedUser = readCachedUser();
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "error">(cachedUser ? "ready" : "loading");
  const [detail, setDetail] = useState("");
  const [user, setUser] = useState<MeUser | null>(cachedUser);

  useEffect(() => {
    const run = async () => {
      const result = await fetchMe(baseUrl);
      if (!result.ok && result.status === 401) {
        clearCachedUser();
        setUser(null);
        setState("unauthorized");
        return;
      }
      if (!result.ok) {
        setState("error");
        setDetail(result.detail || `Unable to load session (${result.status}).`);
        return;
      }
      setUser(result.user || null);
      setState("ready");
    };
    run();
  }, [baseUrl]);

  return { state, detail, user };
}
