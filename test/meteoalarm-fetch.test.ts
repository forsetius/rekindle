import assert from "node:assert/strict";
import test from "node:test";
import { fetchMeteoAlarmAlerts } from "../src/services/meteoalarm.js";

const atomFixture = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <entry>
    <cap:geocode><valueName>EMMA_ID</valueName><value>PL1465</value></cap:geocode>
    <cap:event>Yellow Thunderstorm warning</cap:event>
    <cap:identifier>warning-1465</cap:identifier>
    <title>Yellow Thunderstorm Warning</title>
  </entry>
</feed>`;

const capFixture = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>cap-warning</identifier>
  <info>
    <language>pl-PL</language>
    <event>Burze</event>
    <severity>Moderate</severity>
    <headline>Ostrzeżenie przed burzami</headline>
  </info>
</alert>`;

test("uses the public Polish Atom feed when no EDR token is configured", async () => {
  const requestedUrls: string[] = [];
  const alerts = await fetchMeteoAlarmAlerts(
    {
      countryCode: "PL",
      meteoalarmEmmaId: "PL1465",
      latitude: 52.2297,
      longitude: 21.0122
    },
    async (input) => {
      requestedUrls.push(String(input));
      return new Response(atomFixture);
    }
  );

  assert.equal(alerts[0]?.id, "warning-1465");
  assert.deepEqual(requestedUrls, [
    "https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-poland"
  ]);
});

test("uses EDR GeoJSON and CAP documents when a token is configured", async () => {
  const requestedUrls: string[] = [];
  const alerts = await fetchMeteoAlarmAlerts(
    {
      countryCode: "PL",
      meteoalarmEmmaId: "PL0264",
      latitude: 51.1079,
      longitude: 17.0385,
      meteoalarmEdrToken: "secret"
    },
    async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.startsWith("https://api.meteoalarm.org/edr/v1/")) {
        return Response.json({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[[16, 50], [18, 50], [18, 52], [16, 52], [16, 50]]]
              },
              properties: { hubLink: "https://storage.example/warning.xml" }
            },
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[[20, 52], [22, 52], [22, 54], [20, 54], [20, 52]]]
              },
              properties: { hubLink: "https://storage.example/other.xml" }
            }
          ]
        });
      }
      return new Response(capFixture);
    },
    () => new Date("2026-05-30T09:00:00Z")
  );

  assert.equal(alerts[0]?.id, "cap-warning");
  assert.match(requestedUrls[0] ?? "", /collections\/warnings\/locations\/PL/);
  assert.match(requestedUrls[0] ?? "", /datetime=/);
  assert.match(requestedUrls[0] ?? "", /token=secret/);
  assert.equal(requestedUrls[1], "https://storage.example/warning.xml");
  assert.equal(requestedUrls.length, 2);
});
