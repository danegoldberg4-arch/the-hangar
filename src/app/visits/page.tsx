import { VisitCalendar } from "@/components/visits/visit-calendar";

export default function VisitsPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8">
      <span className="eyebrow">Who&apos;s coming down</span>
      <h1 className="font-narrow font-bold uppercase text-3xl sm:text-4xl tracking-tight mt-1 text-paper mb-2">
        Visit Calendar
      </h1>
      <p className="lead text-galv-dim mb-8">
        Plan visits so the family knows who&apos;s at the house and when.
      </p>

      <VisitCalendar />
    </div>
  );
}
