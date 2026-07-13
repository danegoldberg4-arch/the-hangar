import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather, parseForecastDays } from "./forecast";

const completeDaily = {
  time: ["2026-07-13", "2026-07-14"],
  temperature_2m_max: [18, 19],
  temperature_2m_min: [8, 9],
  precipitation_sum: [0, 2.5],
  wind_speed_10m_max: [12, 16],
  weather_code: [1, 61],
};

describe("Open-Meteo forecast validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts complete aligned daily data", () => {
    expect(parseForecastDays(completeDaily)).toEqual([
      {
        date: "2026-07-13",
        maxTemp: 18,
        minTemp: 8,
        precipitation: 0,
        windMax: 12,
        weatherCode: 1,
      },
      {
        date: "2026-07-14",
        maxTemp: 19,
        minTemp: 9,
        precipitation: 2.5,
        windMax: 16,
        weatherCode: 61,
      },
    ]);
  });

  it("rejects missing, misaligned, and non-finite fields", () => {
    expect(
      parseForecastDays({ ...completeDaily, weather_code: [1] })
    ).toBeNull();
    expect(
      parseForecastDays({ ...completeDaily, precipitation_sum: [0, null] })
    ).toBeNull();
    expect(
      parseForecastDays({ ...completeDaily, temperature_2m_max: [18, NaN] })
    ).toBeNull();
  });

  it("rejects partial current conditions before they reach the UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            utc_offset_seconds: 36_000,
            current: {
              time: "2026-07-13T12:00",
              temperature_2m: 17,
              wind_speed_10m: 5,
              wind_direction_10m: 90,
              precipitation: 0,
              weather_code: 1,
            },
          }),
          { status: 200 }
        )
      )
    );

    await expect(fetchCurrentWeather()).resolves.toBeNull();
  });
});
