import type {
  AirQuality,
  Alert,
  AlertCategory,
  DashboardForecast,
  DailyWeather,
  HourlyWeather,
  Weather
} from "../domain/types.js";
import type { DashboardSnapshot } from "../services/data-service.js";

const POLISH_MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia"
];
const POLISH_MONTHS_STANDALONE = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień"
];
const POLISH_WEEKDAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

export function renderDashboard(snapshot: DashboardSnapshot, serverNow: Date = new Date()): string {
  const localDate = parseLocalDate(snapshot.currentLocalTime);
  const clock = snapshot.currentLocalTime.slice(11, 16);
  const weather = snapshot.weather;
  const weatherHtml =
    weather === undefined
      ? '<span class="missing-data">Brak danych</span>'
      : `<img class="current-weather-icon" src="${iconPathForWeather(weather.current.weatherCode, snapshot.currentLocalTime)}" alt="">
        <span class="current-temperature">${formatTemperature(weather.current.temperatureCelsius)}</span>
        <span class="current-condition">${escapeHtml(weatherDescription(weather.current.weatherCode))}</span>`;

  return renderDocument({
    title: "ReKindle",
    refresh: "1800",
    bodyClass: "dashboard-body",
    body: `<div class="dashboard-screen">
      <div class="screen-header">
        ${renderNavigation("/calendar", escapeHtml(formatHeaderDate(localDate)))}
        <span>${escapeHtml(snapshot.locationName)}</span>
      </div>
      <table class="dashboard-main"><tr>
        <td class="clock-cell">${renderNavigation("/calendar", `<span id="dashboard-clock" data-server-epoch="${serverNow.getTime()}" data-hours="${clock.slice(0, 2)}" data-minutes="${clock.slice(3, 5)}">${clock}</span>`)}</td>
        <td class="current-weather-cell">${renderNavigation("/weather", weatherHtml)}</td>
      </tr></table>
      <table class="dashboard-secondary"><tr>
        <td class="alerts-cell">${renderNavigation("/alerts", `<span class="section-label">Alerty</span>${renderDashboardAlertIcons(snapshot.dashboardAlertCategories)}`)}</td>
        <td class="forecast-cell">${renderNavigation("/weather", `<span class="section-label">Później</span>${renderDashboardForecasts(snapshot.dashboardForecasts)}`)}</td>
      </tr></table>
      <div class="screen-footer"><span>${escapeHtml(snapshot.footerMessage)}</span><span>${formatUpdatedAt(snapshot.updatedAt.weather, snapshot.timeZone)}</span></div>
    </div>
    <script src="/assets/dashboard.js?v=2"></script>`
  });
}

export function renderWeatherPage(snapshot: DashboardSnapshot): string {
  return renderDetailPage(
    "Pogoda",
    formatUpdatedAt(snapshot.updatedAt.weather, snapshot.timeZone),
    renderWeatherContent(snapshot.weather, snapshot.currentLocalTime),
    "Dane: Open-Meteo"
  );
}

export function renderAirQualityPage(snapshot: DashboardSnapshot): string {
  return renderDetailPage(
    "Jakość powietrza",
    formatUpdatedAt(snapshot.updatedAt.airQuality, snapshot.timeZone),
    renderAirQualityContent(snapshot.airQuality),
    "Dane: Open-Meteo · CAMS"
  );
}

export function renderAlertsPage(snapshot: DashboardSnapshot): string {
  return renderDetailPage(
    "Alerty",
    formatUpdatedAt(snapshot.updatedAt.alerts, snapshot.timeZone),
    renderAlertsContent(snapshot.alerts),
    "Oficjalne ostrzeżenia: MeteoAlarm"
  );
}

export function renderCalendarPage(snapshot: DashboardSnapshot, now: Date = new Date()): string {
  const localDate = parseLocalDate(snapshot.currentLocalTime || now.toISOString().slice(0, 16));
  return renderDetailPage(
    `${POLISH_MONTHS_STANDALONE[localDate.getUTCMonth()]} ${localDate.getUTCFullYear()}`,
    formatHeaderDate(localDate),
    renderCalendar(localDate),
    `Tydzień ${readIsoWeek(localDate)}`
  );
}

function renderDetailPage(
  title: string,
  headerDetail: string,
  content: string,
  footerDetail: string
): string {
  return renderDocument({
    title,
    refresh: "300; url=/",
    bodyClass: "detail-body",
    body: `<div class="detail-screen">
      <div class="screen-header">${renderNavigation("/", "← Pulpit")}<span>${escapeHtml(headerDetail)}</span></div>
      <div class="detail-content"><h1>${escapeHtml(title)}</h1>${content}</div>
      <div class="screen-footer"><span>${escapeHtml(footerDetail)}</span><span>Powrót automatyczny za 5 minut</span></div>
    </div>`
  });
}

function renderWeatherContent(weather: Weather | undefined, currentLocalTime: string): string {
  if (weather === undefined) {
    return renderMissingData();
  }
  const nextHours = weather.hourly.filter((hour) => hour.time >= currentLocalTime).slice(0, 6);
  const tomorrow = weather.daily[1] ?? weather.daily[0];
  return `<table class="detail-columns"><tr>
    <td>
      <div class="weather-now"><img class="detail-large-icon" src="${iconPathForWeather(weather.current.weatherCode, weather.current.time)}" alt=""><span class="detail-temperature">${formatTemperature(weather.current.temperatureCelsius)}</span></div>
      <p class="detail-condition">${escapeHtml(weatherDescription(weather.current.weatherCode))}</p>
      <table class="metrics"><tr><td><strong>${formatTemperature(weather.current.apparentTemperatureCelsius)}</strong><small>odczuwalna</small></td><td><strong>${Math.round(weather.current.windSpeedKilometersPerHour)}</strong><small>km/h wiatr</small></td></tr></table>
    </td>
    <td>
      <p class="section-label">Kolejne godziny</p>
      <div class="hourly">${nextHours.map(renderHourlyWeather).join("")}</div>
      ${tomorrow === undefined ? "" : renderTomorrow(tomorrow)}
    </td>
  </tr></table>`;
}

function renderAirQualityContent(airQuality: AirQuality | undefined): string {
  if (airQuality === undefined) {
    return renderMissingData();
  }
  return `<table class="detail-columns"><tr>
    <td><p class="section-label">Europejski AQI</p><p class="aqi-number">${Math.round(airQuality.europeanAqi)}</p><p class="aqi-status">${escapeHtml(airQualityDescription(airQuality.europeanAqi))}</p></td>
    <td><p class="section-label">Składniki</p>${[
      ["PM2.5", airQuality.particulateMatter25],
      ["PM10", airQuality.particulateMatter10],
      ["NO₂", airQuality.nitrogenDioxide],
      ["Ozon", airQuality.ozone],
      ["SO₂", airQuality.sulphurDioxide]
    ].map(([name, value]) => `<p class="pollutant"><span>${name}</span><strong>${value} µg/m³</strong></p>`).join("")}</td>
  </tr></table>`;
}

function renderAlertsContent(alerts: Alert[]): string {
  if (alerts.length === 0) {
    return '<p class="missing-data">Brak aktywnych alertów.</p>';
  }
  return alerts.map((alert) => `<div class="alert-detail">
    <img class="alert-detail-icon" src="${iconPathForAlert(alert.category)}" alt="">
    <div class="alert-detail-copy"><h2>${escapeHtml(alert.title)}</h2><p class="alert-source">${alert.source === "meteoalarm" ? "MeteoAlarm" : "Reguła lokalna"}</p><p>${escapeHtml(alert.description)}</p></div>
  </div>`).join("");
}

function renderCalendar(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: string[] = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"].map(
    (weekday) => `<span class="calendar-weekday">${weekday}</span>`
  );
  for (let index = 0; index < 42; index += 1) {
    const day = index - firstWeekday + 1;
    if (day < 1) {
      cells.push(`<span class="calendar-muted">${previousMonthDays + day}</span>`);
    } else if (day > daysInMonth) {
      cells.push(`<span class="calendar-muted">${day - daysInMonth}</span>`);
    } else {
      cells.push(`<span${day === date.getUTCDate() ? ' class="calendar-today"' : ""}>${day}</span>`);
    }
  }
  return `<div class="calendar">${cells.join("")}</div>`;
}

function renderDashboardAlertIcons(categories: AlertCategory[]): string {
  if (categories.length === 0) {
    return "";
  }
  return `<span class="dashboard-alert-icons">${categories.map((category) => `<img src="${iconPathForAlert(category)}" alt="">`).join("")}</span>`;
}

function renderDashboardForecasts(forecasts: DashboardForecast[]): string {
  if (forecasts.length === 0) {
    return '<span class="missing-data">Brak danych</span>';
  }
  return forecasts.map((forecast) => `<span class="dashboard-forecast">
    <img src="${iconPathForWeather(forecast.weather.weatherCode, forecast.weather.time)}" alt="">
    <span><small>${escapeHtml(forecastLabel(forecast.period))}</small><strong>${formatTemperature(forecast.weather.temperatureCelsius)}</strong></span>
  </span>`).join("");
}

function renderHourlyWeather(weather: HourlyWeather): string {
  return `<span class="hourly-item"><small>${weather.time.slice(11, 16)}</small><img src="${iconPathForWeather(weather.weatherCode, weather.time)}" alt=""><strong>${formatTemperature(weather.temperatureCelsius)}</strong></span>`;
}

function renderTomorrow(weather: DailyWeather): string {
  return `<div class="tomorrow"><p class="section-label">Jutro</p><strong>${formatTemperature(weather.minimumTemperatureCelsius)} / ${formatTemperature(weather.maximumTemperatureCelsius)}</strong><span>${escapeHtml(weatherDescription(weather.weatherCode))}</span></div>`;
}

function renderMissingData(): string {
  return '<p class="missing-data">Brak danych. Serwer spróbuje ponownie przy następnej aktualizacji.</p>';
}

function renderNavigation(destination: string, content: string): string {
  return `<span class="navigation-link" data-href="${destination}" role="link">${content}</span>`;
}

function renderDocument(options: { title: string; refresh: string; bodyClass: string; body: string }): string {
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta http-equiv="refresh" content="${options.refresh}"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(options.title)}</title><link rel="stylesheet" href="/assets/styles.css?v=3"></head>
<body class="${options.bodyClass}"><noscript><style>#rekindle-viewport { visibility: visible !important; }</style></noscript><div id="rekindle-viewport" style="visibility: hidden">${options.body}</div><script src="/assets/compatibility.js?v=5"></script></body></html>`;
}

function iconPathForWeather(weatherCode: number, timestamp: string): string {
  const hour = Number(timestamp.slice(11, 13));
  if (weatherCode >= 95) return iconPath("storm");
  if (weatherCode >= 51) return iconPath("rain");
  if (weatherCode >= 3) return iconPath("cloud");
  if (hour >= 20 || hour < 6) return iconPath("moon");
  if (weatherCode >= 1) return iconPath("partly-cloudy");
  return iconPath("sun");
}

function iconPathForAlert(category: AlertCategory): string {
  return iconPath(`alert-${category}`);
}

function iconPath(iconName: string): string {
  return `/assets/icons/${iconName}.png?v=2`;
}

function weatherDescription(weatherCode: number): string {
  if (weatherCode >= 95) return "Burza";
  if (weatherCode >= 51) return "Opady";
  if (weatherCode >= 3) return "Pochmurno";
  if (weatherCode >= 1) return "Częściowe zachmurzenie";
  return "Bezchmurnie";
}

function forecastLabel(period: DashboardForecast["period"]): string {
  return {
    afternoon: "Popołudnie",
    night: "Noc",
    "tomorrow-morning": "Jutro rano",
    "tomorrow-afternoon": "Jutro po południu"
  }[period];
}

function airQualityDescription(aqi: number): string {
  if (aqi < 20) return "Bardzo dobra";
  if (aqi < 40) return "Dobra";
  if (aqi < 60) return "Umiarkowana";
  if (aqi < 80) return "Niezdrowa";
  if (aqi < 100) return "Bardzo niezdrowa";
  return "Ekstremalnie zła";
}

function formatTemperature(temperature: number): string {
  return `${Math.round(temperature)}°`;
}

function formatUpdatedAt(date: Date | undefined, timeZone: string): string {
  if (date === undefined) {
    return "Brak aktualizacji";
  }
  return `Aktualizacja ${new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date)}`;
}

function formatHeaderDate(date: Date): string {
  return `${POLISH_WEEKDAYS[date.getUTCDay()]} · ${date.getUTCDate()} ${POLISH_MONTHS[date.getUTCMonth()]}`;
}

function parseLocalDate(localTime: string): Date {
  return new Date(`${localTime.slice(0, 10)}T00:00:00Z`);
}

function readIsoWeek(date: Date): number {
  const copy = new Date(date);
  const dayNumber = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(copy.getUTCFullYear(), 0, 4));
  return 1 + Math.round((copy.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
