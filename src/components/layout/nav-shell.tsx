"use client";

import { useEffect, useState } from "react";

/**
 * Sticky header wrapper. Adds translucency + blur + shadow once the page scrolls.
 */
export function NavShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full max-w-full overflow-hidden border-b border-line transition-[box-shadow,background-color] duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-steel/85 shadow-[0_10px_36px_rgba(0,0,0,0.35)]"
          : "bg-steel"
      }`}
    >
      {children}
    </header>
  );
}
