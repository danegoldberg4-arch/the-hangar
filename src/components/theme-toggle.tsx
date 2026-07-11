"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("hangar-theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("hangar-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-md text-galv-dim hover:text-paper hover:bg-steel-3 transition-colors"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
