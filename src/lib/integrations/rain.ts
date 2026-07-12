export interface RainSummary {
  today: number;
  week: number;
  month: number;
  dailyHistory: { date: string; total: number }[];
}

const LAT = -34.73;
const LON = 150.48;

export async function getRainSummary(): Promise<RainSummary> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum&timezone=Australia/Sydney&forecast_days=1&past_days=30`;

    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return { today: 0, week: 0, month: 0, dailyHistory: [] };
    }

    const data = await res.json();

    const times: string[] = data.daily.time;
    const precip: number[] = data.daily.precipitation_sum;

    const dailyHistory = times.map((date, i) => ({
      date,
      total: precip[i] ?? 0,
    }));

    const today = dailyHistory[dailyHistory.length - 1]?.total ?? 0;

    const last7 = dailyHistory.slice(-7);
    const week = last7.reduce((sum, d) => sum + d.total, 0);

    const last30 = dailyHistory.slice(-30);
    const month = last30.reduce((sum, d) => sum + d.total, 0);

    return { today, week, month, dailyHistory };
  } catch (err) {
    console.error("[rain] fetch error:", err);
    return { today: 0, week: 0, month: 0, dailyHistory: [] };
  }
}
