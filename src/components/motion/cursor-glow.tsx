"use client";

import { useEffect } from "react";

/**
 * Feeds cursor coordinates into --mx/--my CSS vars on .card-surface hover,
 * powering the radial spotlight defined in globals.css.
 * Rendered once at the root; event delegated so it works for any card.
 */
export function CursorGlow() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(".card-surface");
      if (!(target instanceof HTMLElement)) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      target.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
