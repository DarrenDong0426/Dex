"use client";
import { useState, useEffect } from "react";
import type { Mode } from "@/app/games";

const STORAGE_KEY = "dex_theme_mode";

// shared dark/light mode between the frontend profile and the admin panel
// (two separate routes with no shared React state) — persisted to
// localStorage so a toggle in either place sticks everywhere, including
// across reloads and other open tabs.
export function useThemeMode(): [Mode, (mode: Mode) => void] {
  // always start at the default — reading localStorage here would mismatch
  // the server-rendered HTML (same hydration pitfall as the URL-hash deep
  // link earlier: SSR has no localStorage, so it always renders "dark").
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") setModeState(stored);

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setModeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setMode(next: Mode) {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return [mode, setMode];
}
