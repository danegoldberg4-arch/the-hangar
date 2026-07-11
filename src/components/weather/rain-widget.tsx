import { getRainSummary } from "@/lib/integrations/rain";

export async function RainWidget() {
  const rain = await getRainSummary();

  const maxDaily = Math.max(...rain.dailyHistory.map((d) => d.total), 0.1);

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Rainfall</h3>
        </div>
        <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
          Nowra · ~25km SE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="font-narrow font-bold text-2xl text-sky-400">
            {rain.today.toFixed(1)}
            <span className="text-xs text-galv-dim ml-0.5">mm</span>
          </div>
          <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">Today</div>
        </div>
        <div>
          <div className="font-narrow font-bold text-2xl text-paper">
            {rain.week.toFixed(1)}
            <span className="text-xs text-galv-dim ml-0.5">mm</span>
          </div>
          <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">7 Days</div>
        </div>
        <div>
          <div className="font-narrow font-bold text-2xl text-paper">
            {rain.month.toFixed(0)}
            <span className="text-xs text-galv-dim ml-0.5">mm</span>
          </div>
          <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">30 Days</div>
        </div>
      </div>

      {rain.dailyHistory.length > 1 && (
        <div className="flex items-end gap-[2px] h-10 overflow-hidden">
          {rain.dailyHistory.map((d) => {
            const height = Math.max((d.total / maxDaily) * 100, 2);
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={d.date}
                className={`flex-1 rounded-sm ${isToday ? "bg-sky-400" : "bg-sky-900/60"}`}
                style={{ height: `${height}%` }}
                title={`${d.date}: ${d.total.toFixed(1)}mm`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
