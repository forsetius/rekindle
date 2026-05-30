import type { AirQuality, DailyWeather, HourlyWeather, Weather } from "../domain/types.js";

const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export function buildWeatherUrl(latitude: number, longitude: number, timeZone: string): URL {
  const url = new URL(FORECAST_API_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timeZone);
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,precipitation_probability"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code"
  );
  return url;
}

export function buildAirQualityUrl(latitude: number, longitude: number, timeZone: string): URL {
  const url = new URL(AIR_QUALITY_API_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timeZone);
  url.searchParams.set(
    "current",
    "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide"
  );
  return url;
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  timeZone: string,
  fetchImpl: typeof fetch = fetch
): Promise<Weather> {
  const response = await fetchImpl(buildWeatherUrl(latitude, longitude, timeZone));
  await ensureSuccessful(response);
  return parseWeatherResponse(await response.json());
}

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  timeZone: string,
  fetchImpl: typeof fetch = fetch
): Promise<AirQuality> {
  const response = await fetchImpl(buildAirQualityUrl(latitude, longitude, timeZone));
  await ensureSuccessful(response);
  return parseAirQualityResponse(await response.json());
}

export function parseWeatherResponse(value: unknown): Weather {
  const response = asRecord(value);
  const current = asRecord(response.current);
  const hourly = asRecord(response.hourly);
  const daily = asRecord(response.daily);

  return {
    current: {
      time: readString(current, "time"),
      temperatureCelsius: readNumber(current, "temperature_2m"),
      apparentTemperatureCelsius: readNumber(current, "apparent_temperature"),
      weatherCode: readNumber(current, "weather_code"),
      windSpeedKilometersPerHour: readNumber(current, "wind_speed_10m")
    },
    hourly: mapHourlyWeather(hourly),
    daily: mapDailyWeather(daily)
  };
}

export function parseAirQualityResponse(value: unknown): AirQuality {
  const response = asRecord(value);
  const current = asRecord(response.current);

  return {
    time: readString(current, "time"),
    europeanAqi: readNumber(current, "european_aqi"),
    particulateMatter25: readNumber(current, "pm2_5"),
    particulateMatter10: readNumber(current, "pm10"),
    nitrogenDioxide: readNumber(current, "nitrogen_dioxide"),
    ozone: readNumber(current, "ozone"),
    sulphurDioxide: readNumber(current, "sulphur_dioxide")
  };
}

function mapHourlyWeather(hourly: Record<string, unknown>): HourlyWeather[] {
  return readStringArray(hourly, "time").map((time, index) => ({
    time,
    temperatureCelsius: readNumberAt(hourly, "temperature_2m", index),
    weatherCode: readNumberAt(hourly, "weather_code", index),
    precipitationProbability: readNumberAt(hourly, "precipitation_probability", index)
  }));
}

function mapDailyWeather(daily: Record<string, unknown>): DailyWeather[] {
  return readStringArray(daily, "time").map((date, index) => ({
    date,
    minimumTemperatureCelsius: readNumberAt(daily, "temperature_2m_min", index),
    maximumTemperatureCelsius: readNumberAt(daily, "temperature_2m_max", index),
    precipitationProbability: readNumberAt(daily, "precipitation_probability_max", index),
    weatherCode: readNumberAt(daily, "weather_code", index)
  }));
}

async function ensureSuccessful(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(`External service returned HTTP ${response.status}`);
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error(`Expected number field: ${key}`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Expected string array field: ${key}`);
  }
  return value;
}

function readNumberAt(record: Record<string, unknown>, key: string, index: number): number {
  const value = record[key];
  if (!Array.isArray(value) || typeof value[index] !== "number") {
    throw new Error(`Expected number array field: ${key}`);
  }
  return value[index];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
