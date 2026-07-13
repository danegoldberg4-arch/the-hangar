"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10 stroke-iron fill-none mx-auto mb-4"
          strokeWidth={1.5}
        >
          <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
        </svg>
        <h1 className="font-narrow font-bold uppercase text-xl text-paper mb-2">
          Connection issue
        </h1>
        <p className="text-sm text-galv-dim mb-4 leading-relaxed">
          Couldn&apos;t reach the house database.
        </p>
        <pre className="text-xs text-iron bg-steel-2 border border-line rounded-lg p-3 mb-4 text-left overflow-auto max-h-32">
          {error.message}
        </pre>
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
