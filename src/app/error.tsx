"use client";

import Image from "next/image";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Image src="/logo-nav.png" alt="The Hangar" width={40} height={40} className="mx-auto mb-4 rounded" />
        <h1 className="font-narrow font-bold uppercase text-xl text-paper mb-2">
          Connection issue
        </h1>
        <p className="text-sm text-galv-dim mb-4 leading-relaxed">
          Couldn&apos;t reach the house database.
        </p>
        <button
          onClick={reset}
          className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md px-5 py-2.5 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
