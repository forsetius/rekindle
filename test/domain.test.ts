import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLocalAlerts,
  mergeAlerts,
  selectDashboardAlertCategories,
  selectFooterMessage
} from "../src/domain/alerts.js";
import { selectDashboardForecasts } from "../src/domain/forecast-periods.js";
import type {
  AirQuality,
  Alert,
  HourlyWeather,
  Weather
} from "../src/domain/types.js";

const hourlyWeather: HourlyWeather[] = [
  { time: "2026-05-30T15:00", temperatureCelsius: 20, weatherCode: 2, precipitationProbability: 10 },
  { time: "2026-05-30T23:00", temperatureCelsius: 11, weatherCode: 1, precipitationProbability: 5 },
  { time: "2026-05-31T08:00", temperatureCelsius: 14, weatherCode: 2, precipitationProbability: 15 },
  { time: "2026-05-31T15:00", temperatureCelsius: 22, weatherCode: 3, precipitationProbability: 20 }
];

test("selects afternoon and night forecasts during the morning", () => {
  const forecasts = selectDashboardForecasts(hourlyWeather, "2026-05-30T09:42");

  assert.deepEqual(
    forecasts.map((forecast) => forecast.period),
    ["afternoon", "night"]
  );
  assert.deepEqual(
    forecasts.map((forecast) => forecast.weather.time),
    ["2026-05-30T15:00", "2026-05-30T23:00"]
  );
});

test("selects night and tomorrow morning forecasts during the afternoon", () => {
  const forecasts = selectDashboardForecasts(hourlyWeather, "2026-05-30T15:30");

  assert.deepEqual(
    forecasts.map((forecast) => forecast.period),
    ["night", "tomorrow-morning"]
  );
});

test("selects tomorrow morning and afternoon forecasts during the night", () => {
  const forecasts = selectDashboardForecasts(hourlyWeather, "2026-05-30T21:10");

  assert.deepEqual(
    forecasts.map((forecast) => forecast.period),
    ["tomorrow-morning", "tomorrow-afternoon"]
  );
});

test("creates local alerts for thunderstorms and unhealthy air", () => {
  const weather: Weather = {
    current: {
      time: "2026-05-30T09:00",
      temperatureCelsius: 18,
      apparentTemperatureCelsius: 17,
      weatherCode: 2,
      windSpeedKilometersPerHour: 12
    },
    hourly: [
      {
        time: "2026-05-30T16:00",
        temperatureCelsius: 19,
        weatherCode: 95,
        precipitationProbability: 65
      }
    ],
    daily: []
  };
  const airQuality: AirQuality = {
    time: "2026-05-30T09:00",
    europeanAqi: 61,
    particulateMatter25: 18,
    particulateMatter10: 28,
    nitrogenDioxide: 10,
    ozone: 35,
    sulphurDioxide: 2
  };

  const alerts = evaluateLocalAlerts(weather, airQuality, "2026-05-30T09:30");

  assert.deepEqual(
    alerts.map((alert) => alert.category),
    ["storm", "air-quality"]
  );
});

test("merges official alerts first and limits dashboard categories to unique values", () => {
  const official: Alert = {
    id: "official-storm",
    source: "meteoalarm",
    category: "storm",
    severity: "moderate",
    title: "Ostrzeżenie przed burzami",
    description: "Możliwe burze.",
    startsAt: "2026-05-30T12:00:00Z",
    endsAt: "2026-05-30T18:00:00Z"
  };
  const localDuplicate: Alert = {
    ...official,
    id: "local-storm",
    source: "local-rule"
  };
  const airQuality: Alert = {
    ...official,
    id: "local-air",
    source: "local-rule",
    category: "air-quality",
    title: "Niezdrowe powietrze"
  };

  const alerts = mergeAlerts([official], [localDuplicate, airQuality]);

  assert.deepEqual(alerts.map((alert) => alert.id), ["official-storm", "local-storm", "local-air"]);
  assert.deepEqual(selectDashboardAlertCategories(alerts, 3), ["storm", "air-quality"]);
  assert.equal(selectFooterMessage(alerts, "Własny komunikat"), "Ostrzeżenie przed burzami");
  assert.equal(selectFooterMessage([], "Własny komunikat"), "Własny komunikat");
  assert.equal(selectFooterMessage([], undefined), "");
});
