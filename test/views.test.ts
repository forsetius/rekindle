import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAirQualityPage,
  renderAlertsPage,
  renderCalendarPage,
  renderDashboard,
  renderWeatherPage
} from "../src/views/render.js";
import { createSnapshot } from "./support/snapshot.js";

test("renders a dashboard with clock script, refresh, links and PNG icons", () => {
  const html = renderDashboard(createSnapshot(), new Date("2026-05-30T09:42:00Z"));

  assert.match(html, /http-equiv="refresh" content="1800"/);
  assert.match(html, /src="\/assets\/compatibility\.js\?v=4"/);
  assert.match(html, /src="\/assets\/dashboard\.js\?v=2"/);
  assert.match(html, /data-href="\/calendar"/);
  assert.match(html, /data-href="\/weather"/);
  assert.match(html, /data-href="\/alerts"/);
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /\.png/);
  assert.match(html, /Aktualizacja 11:35/);
  assert.doesNotMatch(html, /<svg/);
});

test("renders detail pages with a five minute automatic return", () => {
  const snapshot = createSnapshot();
  const pages = [
    renderWeatherPage(snapshot),
    renderAirQualityPage(snapshot),
    renderAlertsPage(snapshot),
    renderCalendarPage(snapshot, new Date("2026-05-30T09:42:00Z"))
  ];

  for (const html of pages) {
    assert.match(html, /http-equiv="refresh" content="300; url=\/"/);
    assert.match(html, /class="screen-footer"/);
    assert.match(html, /data-href="\/"/);
    assert.doesNotMatch(html, /<a /);
  }
});

test("renders only upcoming hours on the weather detail page", () => {
  const snapshot = createSnapshot();
  if (snapshot.weather === undefined) {
    throw new Error("Fixture weather is required");
  }
  snapshot.weather.hourly = [
    { time: "2026-05-30T08:00", temperatureCelsius: 16, weatherCode: 2, precipitationProbability: 10 },
    { time: "2026-05-30T10:00", temperatureCelsius: 19, weatherCode: 2, precipitationProbability: 10 },
    { time: "2026-05-30T11:00", temperatureCelsius: 20, weatherCode: 2, precipitationProbability: 10 }
  ];

  const html = renderWeatherPage(snapshot);

  assert.doesNotMatch(html, /08:00/);
  assert.match(html, /10:00/);
});

test("renders neutral placeholders when external data is unavailable", () => {
  const snapshot = createSnapshot();
  delete snapshot.weather;
  delete snapshot.airQuality;
  const html = renderDashboard(snapshot);

  assert.match(html, /Brak danych/);
});
