import { PlugBoard } from "@/components/plugs/plug-board";

export default function PlugsPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 w-full overflow-x-hidden">
      <span className="eyebrow">Device inventory</span>
      <h1 className="font-narrow font-bold uppercase text-3xl sm:text-4xl tracking-tight mt-1 text-paper mb-2">
        Device Inventory
      </h1>
      <p className="lead text-galv-dim mb-8">
        Record planned edge devices without implying a live connection.
      </p>

      <PlugBoard />
    </div>
  );
}
