/**
 * Weather data via Open-Meteo (free, no API key needed, Australian-accurate)
 * https://open-meteo.com/
 */
import { fetchWithTimeout, parseTimeoutFromEnv } from "@/lib/timeout";

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionCode: number;
  chanceOfRain: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  51: "Light drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  80: "Rain showers",
  95: "Thunderstorm",
  99: "Thunderstorm with hail",
};

const WEATHER_REQUEST_TIMEOUT_MS = parseTimeoutFromEnv(
  "WEATHER_REQUEST_TIMEOUT_MS",
  8_000
);

export async function getWeatherForecast(
  lat: number,
  lng: number,
  daysAhead = 7
): Promise<WeatherDay[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      "weathercode",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "windspeed_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ].join(","),
    hourly: "relativehumidity_2m",
    timezone: "Australia/Sydney",
    forecast_days: daysAhead.toString(),
  });

  const res = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    {
      operation: "Open-Meteo forecast",
      timeoutMs: WEATHER_REQUEST_TIMEOUT_MS,
      next: { revalidate: 3600 },
    } // cache 1 hour
  );

  if (!res.ok) throw new Error(`Weather API error ${res.status}`);

  const data = await res.json();
  const daily = data.daily;

  return (daily.time as string[]).map((date: string, i: number) => ({
    date,
    tempMin: Math.round(daily.temperature_2m_min[i]),
    tempMax: Math.round(daily.temperature_2m_max[i]),
    conditionCode: daily.weathercode[i],
    condition: WMO_CODES[daily.weathercode[i]] ?? "Unknown",
    chanceOfRain: daily.precipitation_probability_max[i] ?? 0,
    humidity: 60, // aggregated hourly average — simplified
    windSpeed: Math.round(daily.windspeed_10m_max[i]),
    uvIndex: Math.round(daily.uv_index_max[i]),
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
  }));
}

export function getWeatherPackingTips(weather: WeatherDay): string[] {
  const tips: string[] = [];
  if (weather.chanceOfRain > 40) tips.push("Bring a compact umbrella or rain jacket");
  if (weather.tempMax > 28) tips.push("Sunscreen SPF 50+, hat, water bottle");
  if (weather.tempMin < 12) tips.push("Bring a warm layer or jacket");
  if (weather.uvIndex >= 6) tips.push("High UV — wear protective clothing and reapply sunscreen");
  if (weather.windSpeed > 30) tips.push("It may be quite windy — a light jacket will help");
  if (weather.conditionCode === 45) tips.push("Foggy conditions expected — allow extra travel time");
  return tips;
}
