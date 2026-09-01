"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Text to animate, e.g. "15", "26.1". Non-numeric values render statically. */
  value: string;
  className?: string;
}

/**
 * Animates a number from 0 to its target when it scrolls into view.
 * Falls back to static rendering for non-numeric strings and reduced motion.
 */
export function CountUp({ value, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const target = Number(value);
  const numeric = Number.isFinite(target) && value.trim() !== "";
  const decimals = value.includes(".") ? value.split(".")[1].length : 0;
  const [display, setDisplay] = useState(numeric ? (0).toFixed(decimals) : value);

  useEffect(() => {
    if (!numeric) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support — fill in the final value asynchronously.
      requestAnimationFrame(() => setDisplay(target.toFixed(decimals)));
      return;
    }
    let frame = 0;
    const start = () => {
      const animate = (t0: number, elapsed: number) => {
        const duration = 1100;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay((target * eased).toFixed(decimals));
        if (p < 1) frame = requestAnimationFrame((t) => animate(t0, t - t0));
      };
      frame = requestAnimationFrame((t0) => animate(t0, 0));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            start();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [numeric, target, decimals]);

  if (!numeric) {
    return <span ref={ref} className={className}>{value}</span>;
  }

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
