import type { DashboardSnapshot } from "../../src/services/data-service.js";

export function createSnapshot(
  overrides: Partial<DashboardSnapshot> = {}
): DashboardSnapshot {
  return {
    locationName: "Warszawa",
    timeZone: "Europe/Warsaw",
    currentLocalTime: "2026-05-30T09:42",
    weather: {
      current: {
        time: "2026-05-30T09:00",
        temperatureCelsius: 18,
        apparentTemperatureCelsius: 17,
        weatherCode: 2,
        windSpeedKilometersPerHour: 12
      },
      hourly: [
        { time: "2026-05-30T15:00", temperatureCelsius: 20, weatherCode: 2, precipitationProbability: 10 },
        { time: "2026-05-30T23:00", temperatureCelsius: 11, weatherCode: 1, precipitationProbability: 5 }
      ],
      daily: [
        {
          date: "2026-05-30",
          minimumTemperatureCelsius: 11,
          maximumTemperatureCelsius: 20,
          precipitationProbability: 30,
          weatherCode: 2
        }
      ]
    },
    airQuality: {
      time: "2026-05-30T09:00",
      europeanAqi: 34,
      particulateMatter25: 8,
      particulateMatter10: 17,
      nitrogenDioxide: 12,
      ozone: 41,
      sulphurDioxide: 3
    },
    dashboardForecasts: [
      {
        period: "afternoon",
        weather: { time: "2026-05-30T15:00", temperatureCelsius: 20, weatherCode: 2, precipitationProbability: 10 }
      },
      {
        period: "night",
        weather: { time: "2026-05-30T23:00", temperatureCelsius: 11, weatherCode: 1, precipitationProbability: 5 }
      }
    ],
    alerts: [
      {
        id: "storm",
        source: "local-rule",
        category: "storm",
        severity: "moderate",
        title: "Możliwe burze",
        description: "Prognoza wskazuje możliwość burz."
      }
    ],
    dashboardAlertCategories: ["storm"],
    footerMessage: "Możliwe burze",
    updatedAt: {
      weather: new Date("2026-05-30T09:35:00Z"),
      airQuality: new Date("2026-05-30T09:10:00Z"),
      alerts: new Date("2026-05-30T09:30:00Z")
    },
    ...overrides
  };
}
