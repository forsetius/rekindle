import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAirQualityUrl,
  buildWeatherUrl,
  parseAirQualityResponse,
  parseWeatherResponse
} from "../src/services/open-meteo.js";

test("normalizes a weather response", () => {
  const weather = parseWeatherResponse({
    current: {
      time: "2026-05-30T09:00",
      temperature_2m: 18.3,
      apparent_temperature: 17.1,
      weather_code: 2,
      wind_speed_10m: 12.4
    },
    hourly: {
      time: ["2026-05-30T09:00", "2026-05-30T10:00"],
      temperature_2m: [18.3, 19.1],
      weather_code: [2, 3],
      precipitation_probability: [10, 20]
    },
    daily: {
      time: ["2026-05-30"],
      temperature_2m_min: [11],
      temperature_2m_max: [20],
      precipitation_probability_max: [30],
      weather_code: [2]
    }
  });

  assert.equal(weather.current.temperatureCelsius, 18.3);
  assert.equal(weather.hourly[1]?.precipitationProbability, 20);
  assert.equal(weather.daily[0]?.maximumTemperatureCelsius, 20);
});

test("normalizes an air quality response", () => {
  const airQuality = parseAirQualityResponse({
    current: {
      time: "2026-05-30T09:00",
      european_aqi: 34,
      pm2_5: 8,
      pm10: 17,
      nitrogen_dioxide: 12,
      ozone: 41,
      sulphur_dioxide: 3
    }
  });

  assert.equal(airQuality.europeanAqi, 34);
  assert.equal(airQuality.particulateMatter25, 8);
});

test("builds Open-Meteo URLs for the configured location", () => {
  const weatherUrl = buildWeatherUrl(52.2297, 21.0122, "Europe/Warsaw");
  const airQualityUrl = buildAirQualityUrl(52.2297, 21.0122, "Europe/Warsaw");

  assert.equal(weatherUrl.searchParams.get("latitude"), "52.2297");
  assert.match(weatherUrl.searchParams.get("hourly") ?? "", /precipitation_probability/);
  assert.equal(airQualityUrl.searchParams.get("timezone"), "Europe/Warsaw");
});
