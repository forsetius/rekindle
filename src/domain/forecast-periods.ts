import type {
  DashboardForecast,
  DashboardForecastPeriod,
  HourlyWeather
} from "./types.js";

interface ForecastTarget {
  period: DashboardForecastPeriod;
  date: string;
  hour: number;
}

export function selectDashboardForecasts(
  hourlyWeather: HourlyWeather[],
  currentLocalTime: string
): DashboardForecast[] {
  const currentDate = currentLocalTime.slice(0, 10);
  const currentHour = Number(currentLocalTime.slice(11, 13));
  const tomorrow = addDays(currentDate, 1);
  const targets = selectTargets(currentDate, tomorrow, currentHour);

  return targets.flatMap((target) => {
    const weather = findClosestWeather(hourlyWeather, target);
    return weather === undefined ? [] : [{ period: target.period, weather }];
  });
}

function selectTargets(currentDate: string, tomorrow: string, currentHour: number): ForecastTarget[] {
  if (currentHour >= 6 && currentHour < 12) {
    return [
      { period: "afternoon", date: currentDate, hour: 15 },
      { period: "night", date: currentDate, hour: 23 }
    ];
  }

  if (currentHour >= 12 && currentHour < 20) {
    return [
      { period: "night", date: currentDate, hour: 23 },
      { period: "tomorrow-morning", date: tomorrow, hour: 8 }
    ];
  }

  return [
    { period: "tomorrow-morning", date: tomorrow, hour: 8 },
    { period: "tomorrow-afternoon", date: tomorrow, hour: 15 }
  ];
}

function findClosestWeather(
  hourlyWeather: HourlyWeather[],
  target: ForecastTarget
): HourlyWeather | undefined {
  const candidates = hourlyWeather.filter((weather) => weather.time.slice(0, 10) === target.date);

  return candidates.reduce<HourlyWeather | undefined>((closest, candidate) => {
    if (closest === undefined) {
      return candidate;
    }

    const closestDistance = Math.abs(readHour(closest.time) - target.hour);
    const candidateDistance = Math.abs(readHour(candidate.time) - target.hour);
    return candidateDistance < closestDistance ? candidate : closest;
  }, undefined);
}

function addDays(date: string, numberOfDays: number): string {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return new Date(timestamp + numberOfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function readHour(timestamp: string): number {
  return Number(timestamp.slice(11, 13));
}
