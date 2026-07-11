export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-steel text-paper flex items-center justify-center px-4">
      <div className="text-center">
        <svg
          viewBox="0 0 24 24"
          className="w-12 h-12 stroke-iron fill-none mx-auto mb-4"
          strokeWidth={1.5}
        >
          <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
        </svg>
        <h1 className="font-narrow font-bold uppercase text-2xl tracking-tight text-paper">
          The Hangar
        </h1>
        <p className="font-serif italic text-galv-dim mt-2">
          You&apos;re offline. Some content may be unavailable until you reconnect.
        </p>
      </div>
    </div>
  );
}
