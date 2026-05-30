import type { AppConfig } from "../config.js";
import {
  evaluateLocalAlerts,
  mergeAlerts,
  selectDashboardAlertCategories,
  selectFooterMessage
} from "../domain/alerts.js";
import { selectDashboardForecasts } from "../domain/forecast-periods.js";
import type {
  AirQuality,
  Alert,
  AlertCategory,
  DashboardForecast,
  Weather
} from "../domain/types.js";
import { createCacheEntry, refreshCache, type CacheEntry } from "./cache.js";
import { fetchMeteoAlarmAlerts } from "./meteoalarm.js";
import { fetchAirQuality, fetchWeather } from "./open-meteo.js";

const WEATHER_REFRESH_MILLISECONDS = 30 * 60 * 1000;
const AIR_QUALITY_REFRESH_MILLISECONDS = 60 * 60 * 1000;
const ALERTS_REFRESH_MILLISECONDS = 15 * 60 * 1000;

export interface DashboardSnapshot {
  locationName: string;
  timeZone: string;
  currentLocalTime: string;
  weather?: Weather;
  airQuality?: AirQuality;
  dashboardForecasts: DashboardForecast[];
  alerts: Alert[];
  dashboardAlertCategories: AlertCategory[];
  footerMessage: string;
  updatedAt: {
    weather?: Date;
    airQuality?: Date;
    alerts?: Date;
  };
}

export interface HealthSnapshot {
  status: "ok";
  sources: {
    weather: HealthSource;
    airQuality: HealthSource;
    alerts: HealthSource;
  };
}

interface HealthSource {
  hasData: boolean;
  lastSuccessAt?: string;
  lastError?: string;
  refreshInProgress: boolean;
}

export class DataService {
  readonly weatherCache = createCacheEntry<Weather>();
  readonly airQualityCache = createCacheEntry<AirQuality>();
  readonly alertsCache = createCacheEntry<Alert[]>();

  private readonly intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async refreshAll(): Promise<void> {
    await Promise.allSettled([
      this.refreshWeather(),
      this.refreshAirQuality(),
      this.refreshAlerts()
    ]);
  }

  async refreshWeather(): Promise<Weather> {
    return refreshCache(
      this.weatherCache,
      async () =>
        fetchWeather(
          this.config.latitude,
          this.config.longitude,
          this.config.timeZone,
          this.fetchImpl
        ),
      this.now
    );
  }

  async refreshAirQuality(): Promise<AirQuality> {
    return refreshCache(
      this.airQualityCache,
      async () =>
        fetchAirQuality(
          this.config.latitude,
          this.config.longitude,
          this.config.timeZone,
          this.fetchImpl
        ),
      this.now
    );
  }

  async refreshAlerts(): Promise<Alert[]> {
    return refreshCache(
      this.alertsCache,
      async () => fetchMeteoAlarmAlerts(this.config, this.fetchImpl, this.now),
      this.now
    );
  }

  start(): void {
    void this.refreshAll();
    this.intervals.push(
      setInterval(() => void this.runScheduledRefresh(() => this.refreshWeather()), WEATHER_REFRESH_MILLISECONDS),
      setInterval(() => void this.runScheduledRefresh(() => this.refreshAirQuality()), AIR_QUALITY_REFRESH_MILLISECONDS),
      setInterval(() => void this.runScheduledRefresh(() => this.refreshAlerts()), ALERTS_REFRESH_MILLISECONDS)
    );
  }

  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.length = 0;
  }

  createSnapshot(): DashboardSnapshot {
    const currentLocalTime = formatLocalTime(this.now(), this.config.timeZone);
    const localAlerts = evaluateLocalAlerts(
      this.weatherCache.data,
      this.airQualityCache.data,
      currentLocalTime
    );
    const alerts = mergeAlerts(this.alertsCache.data ?? [], localAlerts);

    return {
      locationName: this.config.locationName,
      timeZone: this.config.timeZone,
      currentLocalTime,
      ...optionalProperty("weather", this.weatherCache.data),
      ...optionalProperty("airQuality", this.airQualityCache.data),
      dashboardForecasts: selectDashboardForecasts(this.weatherCache.data?.hourly ?? [], currentLocalTime),
      alerts,
      dashboardAlertCategories: selectDashboardAlertCategories(alerts, 3),
      footerMessage: selectFooterMessage(alerts, this.config.customFooterMessage),
      updatedAt: {
        ...optionalProperty("weather", this.weatherCache.lastSuccessAt),
        ...optionalProperty("airQuality", this.airQualityCache.lastSuccessAt),
        ...optionalProperty("alerts", this.alertsCache.lastSuccessAt)
      }
    };
  }

  createHealthSnapshot(): HealthSnapshot {
    return {
      status: "ok",
      sources: {
        weather: createHealthSource(this.weatherCache),
        airQuality: createHealthSource(this.airQualityCache),
        alerts: createHealthSource(this.alertsCache)
      }
    };
  }

  private async runScheduledRefresh(refresh: () => Promise<unknown>): Promise<void> {
    try {
      await refresh();
    } catch (error: unknown) {
      console.error("Scheduled data refresh failed", error);
    }
  }
}

function formatLocalTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function createHealthSource<T>(cache: CacheEntry<T>): HealthSource {
  return {
    hasData: cache.data !== undefined,
    refreshInProgress: cache.inFlight !== undefined,
    ...optionalProperty("lastSuccessAt", cache.lastSuccessAt?.toISOString()),
    ...optionalProperty("lastError", cache.lastError)
  };
}

function optionalProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<Key, Value>>);
}
