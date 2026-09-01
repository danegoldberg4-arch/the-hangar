"use client";

import { SessionProvider } from "next-auth/react";
import { CursorGlow } from "@/components/motion/cursor-glow";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CursorGlow />
    </SessionProvider>
  );
}
