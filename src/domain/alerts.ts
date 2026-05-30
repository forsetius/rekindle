import type { AirQuality, Alert, AlertCategory, AlertSeverity, Weather } from "./types.js";

const THUNDERSTORM_CODES = new Set([95, 96, 99]);
const UNHEALTHY_AIR_QUALITY_THRESHOLD = 60;

type AlertEvaluator = (
  weather: Weather | undefined,
  airQuality: AirQuality | undefined,
  currentLocalTime: string
) => Alert | undefined;

const alertEvaluators: AlertEvaluator[] = [evaluateThunderstormAlert, evaluateAirQualityAlert];

export function evaluateLocalAlerts(
  weather: Weather | undefined,
  airQuality: AirQuality | undefined,
  currentLocalTime: string
): Alert[] {
  return alertEvaluators.flatMap((evaluator) => {
    const alert = evaluator(weather, airQuality, currentLocalTime);
    return alert === undefined ? [] : [alert];
  });
}

export function mergeAlerts(officialAlerts: Alert[], localAlerts: Alert[]): Alert[] {
  return [...sortAlerts(officialAlerts), ...sortAlerts(localAlerts)];
}

export function selectDashboardAlertCategories(
  alerts: Alert[],
  maximumCategories: number
): AlertCategory[] {
  const categories: AlertCategory[] = [];

  for (const alert of alerts) {
    if (!categories.includes(alert.category)) {
      categories.push(alert.category);
    }

    if (categories.length === maximumCategories) {
      break;
    }
  }

  return categories;
}

export function selectFooterMessage(alerts: Alert[], customFooterMessage: string | undefined): string {
  return alerts[0]?.title ?? customFooterMessage ?? "";
}

function evaluateThunderstormAlert(
  weather: Weather | undefined,
  _airQuality: AirQuality | undefined,
  currentLocalTime: string
): Alert | undefined {
  const currentTimestamp = parseLocalTimestamp(currentLocalTime);
  const rangeEnd = currentTimestamp + 12 * 60 * 60 * 1000;
  const thunderstorm = weather?.hourly.find((hourlyWeather) => {
    const timestamp = parseLocalTimestamp(hourlyWeather.time);
    return (
      timestamp >= currentTimestamp &&
      timestamp <= rangeEnd &&
      THUNDERSTORM_CODES.has(hourlyWeather.weatherCode)
    );
  });

  if (thunderstorm === undefined) {
    return undefined;
  }

  return {
    id: `local-storm-${thunderstorm.time}`,
    source: "local-rule",
    category: "storm",
    severity: "moderate",
    title: "Możliwe burze",
    description: "Prognoza wskazuje możliwość burz w ciągu najbliższych 12 godzin.",
    startsAt: thunderstorm.time
  };
}

function evaluateAirQualityAlert(
  _weather: Weather | undefined,
  airQuality: AirQuality | undefined
): Alert | undefined {
  if (airQuality === undefined || airQuality.europeanAqi < UNHEALTHY_AIR_QUALITY_THRESHOLD) {
    return undefined;
  }

  return {
    id: `local-air-quality-${airQuality.time}`,
    source: "local-rule",
    category: "air-quality",
    severity: airQuality.europeanAqi >= 80 ? "severe" : "moderate",
    title: "Niezdrowe powietrze",
    description: `Europejski indeks jakości powietrza wynosi ${airQuality.europeanAqi}.`,
    startsAt: airQuality.time
  };
}

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (first, second) => severityRank(second.severity) - severityRank(first.severity)
  );
}

function severityRank(severity: AlertSeverity): number {
  return {
    extreme: 4,
    severe: 3,
    moderate: 2,
    minor: 1,
    unknown: 0
  }[severity];
}

function parseLocalTimestamp(timestamp: string): number {
  return Date.parse(timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`);
}
