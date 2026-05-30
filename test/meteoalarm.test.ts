import assert from "node:assert/strict";
import test from "node:test";
import {
  extractEdrCapLinks,
  parseAtomAlerts,
  parseCapAlert
} from "../src/services/meteoalarm.js";

const atomFixture = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <entry>
    <cap:geocode><valueName>EMMA_ID</valueName><value>PL3262</value></cap:geocode>
    <cap:areaDesc>Zachodniopomorskie Province Szczecin County</cap:areaDesc>
    <cap:event>Yellow Thunderstorm warning</cap:event>
    <cap:onset>2026-05-30T12:00:00+00:00</cap:onset>
    <cap:expires>2026-05-30T18:00:00+00:00</cap:expires>
    <cap:severity>Moderate</cap:severity>
    <cap:identifier>warning-3262</cap:identifier>
    <title>Yellow Thunderstorm Warning</title>
  </entry>
  <entry>
    <cap:geocode><valueName>EMMA_ID</valueName><value>PL1465</value></cap:geocode>
    <cap:event>Yellow Wind warning</cap:event>
    <cap:identifier>warning-other</cap:identifier>
    <title>Yellow Wind Warning</title>
  </entry>
</feed>`;

const capFixture = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>cap-warning</identifier>
  <sent>2026-05-30T08:00:00+00:00</sent>
  <info>
    <language>pl-PL</language>
    <category>Met</category>
    <event>Burze</event>
    <severity>Severe</severity>
    <onset>2026-05-30T12:00:00+00:00</onset>
    <expires>2026-05-30T18:00:00+00:00</expires>
    <headline>Ostrzeżenie przed burzami</headline>
    <description>Prognozowane są burze.</description>
  </info>
</alert>`;

test("filters Atom warnings by EMMA_ID", () => {
  const alerts = parseAtomAlerts(atomFixture, "PL3262");

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.id, "warning-3262");
  assert.equal(alerts[0]?.category, "storm");
  assert.equal(alerts[0]?.source, "meteoalarm");
});

test("parses a CAP warning", () => {
  const alert = parseCapAlert(capFixture);

  assert.equal(alert.id, "cap-warning");
  assert.equal(alert.category, "storm");
  assert.equal(alert.severity, "severe");
  assert.equal(alert.description, "Prognozowane są burze.");
});

test("extracts XML CAP links from an EDR GeoJSON response", () => {
  const links = extractEdrCapLinks({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          hubLink: "https://storage.example/warning.xml"
        }
      },
      {
        type: "Feature",
        links: [
          { href: "https://storage.example/another.xml", rel: "xml", type: "application/xml" }
        ],
        properties: {}
      }
    ]
  });

  assert.deepEqual(links, [
    "https://storage.example/warning.xml",
    "https://storage.example/another.xml"
  ]);
});

test("extracts an XML CAP link from a single EDR GeoJSON feature", () => {
  const links = extractEdrCapLinks({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [17.0385, 51.1079]
    },
    properties: {
      hubLink: "https://storage.example/wroclaw.xml"
    }
  });

  assert.deepEqual(links, ["https://storage.example/wroclaw.xml"]);
});
