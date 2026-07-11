import { RestockBoard } from "@/components/restock/restock-board";

export default function RestockPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <span className="eyebrow">Before you come down</span>
      <h1 className="font-narrow font-bold uppercase text-3xl sm:text-4xl tracking-tight mt-1 text-paper mb-2">
        Restock List
      </h1>
      <p className="lead text-galv-dim max-w-2xl mb-8">
        Note what&apos;s run out so the next person knows to bring it. Mark items as &quot;brought&quot; when you restock them.
      </p>

      <RestockBoard />
    </div>
  );
}
