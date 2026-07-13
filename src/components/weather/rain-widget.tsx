import { getRainSummary } from "@/lib/integrations/rain";
import { RainChart } from "@/components/weather/rain-chart";

export async function RainWidget() {
  const rain = await getRainSummary();

  if (!rain) {
    return (
      <div className="card-surface p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-galv-dim" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Rainfall</h3>
          </div>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">unavailable</span>
        </div>
        <p className="text-xs text-galv-dim">Rainfall observations are unavailable.</p>
      </div>
    );
  }

  return (
    <RainChart
      today={rain.today}
      week={rain.week}
      month={rain.month}
      history={rain.dailyHistory}
      freshness={rain.freshness}
      observedAt={rain.observedAt}
      ageSeconds={rain.ageSeconds}
    />
  );
}
