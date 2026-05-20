"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

export type ThemeMode = "system" | "light" | "dark";

const THEME_KEY = "fotoz_theme";
const THEME_EVENT = "fotoz-theme-change";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === THEME_KEY) onStoreChange();
  };
  const onTheme = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, onTheme);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onTheme);
  };
}

export function getThemeMode(): ThemeMode {
  return readStoredMode();
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, mode);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function useThemeMode() {
  return useSyncExternalStore<ThemeMode>(subscribe, getThemeMode, () => "system");
}

export function ThemeManager() {
  const pathname = usePathname();
  const mode = useThemeMode();
  const isLanding = pathname === "/";

  useEffect(() => {
    if (isLanding) {
      document.documentElement.classList.remove("dark");
      return;
    }

    const apply = () => {
      document.documentElement.classList.toggle("dark", resolveDark(mode));
    };

    apply();

    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [isLanding, mode]);

  return null;
}
