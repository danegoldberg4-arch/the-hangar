import { PlugBoard } from "@/components/plugs/plug-board";

export default function PlugsPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 w-full overflow-x-hidden">
      <span className="eyebrow">Solar automation</span>
      <h1 className="font-narrow font-bold uppercase text-3xl sm:text-4xl tracking-tight mt-1 text-paper mb-2">
        Smart Plugs
      </h1>
      <p className="lead text-galv-dim mb-8">
        Control appliances remotely and automate based on solar conditions.
      </p>

      <PlugBoard />
    </div>
  );
}
