import { getRainSummary } from "@/lib/integrations/rain";
import { RainChart } from "@/components/weather/rain-chart";

export async function RainWidget() {
  const rain = await getRainSummary();

  return (
    <RainChart
      today={rain.today}
      week={rain.week}
      month={rain.month}
      history={rain.dailyHistory}
    />
  );
}
