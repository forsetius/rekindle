import assert from "node:assert/strict";
import test from "node:test";
import type { AppConfig } from "../src/config.js";
import { DataService } from "../src/services/data-service.js";

const config: AppConfig = {
  port: 3000,
  locationName: "Warszawa",
  latitude: 52.2297,
  longitude: 21.0122,
  timeZone: "Europe/Warsaw",
  countryCode: "PL",
  meteoalarmEmmaId: "PL1465",
  customFooterMessage: "Miłego dnia"
};

test("keeps successful sources available when one source fails", async () => {
  const dataService = new DataService(
    config,
    async (input) => {
      const url = String(input);
      if (url.includes("air-quality-api")) {
        return new Response("unavailable", { status: 503 });
      }
      if (url.includes("open-meteo.com")) {
        return Response.json({
          current: {
            time: "2026-05-30T09:00",
            temperature_2m: 18,
            apparent_temperature: 17,
            weather_code: 2,
            wind_speed_10m: 12
          },
          hourly: {
            time: ["2026-05-30T15:00", "2026-05-30T23:00"],
            temperature_2m: [20, 11],
            weather_code: [2, 1],
            precipitation_probability: [10, 5]
          },
          daily: {
            time: ["2026-05-30"],
            temperature_2m_min: [11],
            temperature_2m_max: [20],
            precipitation_probability_max: [30],
            weather_code: [2]
          }
        });
      }
      return new Response(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"></feed>`);
    },
    () => new Date("2026-05-30T09:42:00Z")
  );

  await dataService.refreshAll();
  const snapshot = dataService.createSnapshot();
  const health = dataService.createHealthSnapshot();

  assert.equal(snapshot.weather?.current.temperatureCelsius, 18);
  assert.equal(snapshot.airQuality, undefined);
  assert.equal(snapshot.footerMessage, "Miłego dnia");
  assert.equal(health.sources.weather.hasData, true);
  assert.equal(health.sources.airQuality.hasData, false);
  assert.match(health.sources.airQuality.lastError ?? "", /HTTP 503/);
});
