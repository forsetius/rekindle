export type AlertCategory =
  | "air-quality"
  | "cold"
  | "flood"
  | "heat"
  | "other"
  | "storm"
  | "wind";

export type AlertSeverity = "extreme" | "minor" | "moderate" | "severe" | "unknown";

export interface CurrentWeather {
  time: string;
  temperatureCelsius: number;
  apparentTemperatureCelsius: number;
  weatherCode: number;
  windSpeedKilometersPerHour: number;
}

export interface HourlyWeather {
  time: string;
  temperatureCelsius: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface DailyWeather {
  date: string;
  minimumTemperatureCelsius: number;
  maximumTemperatureCelsius: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface Weather {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

export interface AirQuality {
  time: string;
  europeanAqi: number;
  particulateMatter25: number;
  particulateMatter10: number;
  nitrogenDioxide: number;
  ozone: number;
  sulphurDioxide: number;
}

export interface Alert {
  id: string;
  source: "local-rule" | "meteoalarm";
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
}

export type DashboardForecastPeriod =
  | "afternoon"
  | "night"
  | "tomorrow-afternoon"
  | "tomorrow-morning";

export interface DashboardForecast {
  period: DashboardForecastPeriod;
  weather: HourlyWeather;
}
