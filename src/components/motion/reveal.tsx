"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Milliseconds to delay the entrance animation after the element enters the viewport. */
  delay?: number;
  className?: string;
}

/**
 * Fades/slides children in when they scroll into view.
 * Progressive enhancement: without JS the element stays .reveal (opacity-0),
 * so prefers-reduced-motion and the no-animation fallback still render content.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (delay ? { "--reveal-delay": `${delay}ms` } : undefined) as CSSProperties | undefined;

  return (
    <div ref={ref} className={`reveal${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
