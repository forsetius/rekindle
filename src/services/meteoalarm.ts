import { XMLParser } from "fast-xml-parser";
import type { Alert, AlertCategory, AlertSeverity } from "../domain/types.js";

const POLISH_ATOM_URL = "https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-poland";
const EDR_API_URL = "https://api.meteoalarm.org/edr/v1";

export interface MeteoAlarmConfig {
  countryCode: string;
  meteoalarmEmmaId: string;
  latitude: number;
  longitude: number;
  meteoalarmEdrToken?: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true
});

export function parseAtomAlerts(xml: string, emmaId: string): Alert[] {
  const parsed = asRecord(xmlParser.parse(xml));
  const feed = asRecord(parsed.feed);

  return asArray(feed.entry)
    .map(asRecord)
    .filter((entry) => hasEmmaId(entry.geocode, emmaId))
    .map((entry) => {
      const event = asString(entry.event);
      return {
        id: asString(entry.identifier) || asString(entry.id) || asString(entry.title),
        source: "meteoalarm",
        category: mapAlertCategory(event),
        severity: mapSeverity(entry.severity),
        title: asString(entry.title) || event || "Ostrzeżenie pogodowe",
        description: asString(entry.areaDesc) || event || "Aktywne ostrzeżenie pogodowe",
        ...optionalString("startsAt", entry.onset),
        ...optionalString("endsAt", entry.expires)
      };
    });
}

export function parseCapAlert(xml: string): Alert {
  const parsed = asRecord(xmlParser.parse(xml));
  const alert = asRecord(parsed.alert);
  const info = selectPolishInfo(alert.info);
  const event = asString(info.event);

  return {
    id: asString(alert.identifier),
    source: "meteoalarm",
    category: mapAlertCategory(event),
    severity: mapSeverity(info.severity),
    title: asString(info.headline) || event || "Ostrzeżenie pogodowe",
    description: asString(info.description) || event || "Aktywne ostrzeżenie pogodowe",
    ...optionalString("startsAt", info.onset),
    ...optionalString("endsAt", info.expires)
  };
}

export function extractEdrCapLinks(
  geoJson: unknown,
  location?: { latitude: number; longitude: number }
): string[] {
  return extractEdrFeatures(geoJson)
    .map(asRecord)
    .filter((feature) => featureContainsLocation(feature, location))
    .flatMap((feature) => {
      const properties = asRecord(feature.properties);
      const hubLink = asString(properties.hubLink);
      if (hubLink !== "") {
        return [hubLink];
      }

      return asArray(feature.links)
        .map(asRecord)
        .filter((link) => asString(link.rel) === "xml" || asString(link.type) === "application/xml")
        .map((link) => asString(link.href))
        .filter((href) => href !== "");
    });
}

function extractEdrFeatures(geoJson: unknown): unknown[] {
  const featureCollectionOrFeature = asRecord(geoJson);
  if (asString(featureCollectionOrFeature.type) === "Feature") {
    return [featureCollectionOrFeature];
  }
  return asArray(featureCollectionOrFeature.features);
}

export async function fetchMeteoAlarmAlerts(
  config: MeteoAlarmConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => Date = () => new Date()
): Promise<Alert[]> {
  if (config.meteoalarmEdrToken !== undefined) {
    return fetchEdrAlerts(config, fetchImpl, now);
  }

  if (config.countryCode !== "PL") {
    throw new Error("The public Atom adapter currently supports COUNTRY_CODE=PL only");
  }

  const response = await fetchImpl(POLISH_ATOM_URL);
  ensureSuccessful(response);
  return parseAtomAlerts(await response.text(), config.meteoalarmEmmaId);
}

async function fetchEdrAlerts(
  config: MeteoAlarmConfig,
  fetchImpl: typeof fetch,
  now: () => Date
): Promise<Alert[]> {
  const currentTime = now();
  const url = new URL(`${EDR_API_URL}/collections/warnings/locations/${config.countryCode}`);
  url.searchParams.set(
    "datetime",
    `${new Date(currentTime.getTime() - 24 * 60 * 60 * 1000).toISOString()}/${currentTime.toISOString()}`
  );
  url.searchParams.set("active", `${currentTime.toISOString()}/`);
  url.searchParams.set("language", "pl-PL");
  url.searchParams.set("token", config.meteoalarmEdrToken ?? "");

  const response = await fetchImpl(url);
  ensureSuccessful(response);
  const capLinks = extractEdrCapLinks(await response.json(), config);
  return Promise.all(
    capLinks.map(async (capLink) => {
      const capResponse = await fetchImpl(capLink);
      ensureSuccessful(capResponse);
      return parseCapAlert(await capResponse.text());
    })
  );
}

function hasEmmaId(value: unknown, emmaId: string): boolean {
  return asArray(value)
    .map(asRecord)
    .some(
      (geocode) =>
        asString(geocode.valueName) === "EMMA_ID" && asString(geocode.value) === emmaId
    );
}

function featureContainsLocation(
  feature: Record<string, unknown>,
  location: { latitude: number; longitude: number } | undefined
): boolean {
  if (location === undefined) {
    return true;
  }

  const containsLocation = geometryContainsLocation(
    asRecord(feature.geometry),
    location.longitude,
    location.latitude
  );
  return containsLocation ?? true;
}

function geometryContainsLocation(
  geometry: Record<string, unknown>,
  longitude: number,
  latitude: number
): boolean | undefined {
  const geometryType = asString(geometry.type);
  if (geometryType === "Polygon") {
    return polygonContainsLocation(geometry.coordinates, longitude, latitude);
  }
  if (geometryType === "MultiPolygon") {
    const polygons = asArray(geometry.coordinates);
    const results = polygons.map((polygon) => polygonContainsLocation(polygon, longitude, latitude));
    return results.every((result) => result === undefined)
      ? undefined
      : results.some((result) => result === true);
  }
  return undefined;
}

function polygonContainsLocation(
  polygon: unknown,
  longitude: number,
  latitude: number
): boolean | undefined {
  const exteriorRing = asArray(asArray(polygon)[0])
    .map(asCoordinate)
    .filter((coordinate): coordinate is [number, number] => coordinate !== undefined);
  if (exteriorRing.length < 3) {
    return undefined;
  }

  let isInside = false;
  for (let index = 0, previousIndex = exteriorRing.length - 1; index < exteriorRing.length; previousIndex = index, index += 1) {
    const current = exteriorRing[index];
    const previous = exteriorRing[previousIndex];
    if (current === undefined || previous === undefined) {
      continue;
    }
    const crossesLatitude = current[1] > latitude !== previous[1] > latitude;
    const longitudeAtLatitude =
      ((previous[0] - current[0]) * (latitude - current[1])) / (previous[1] - current[1]) +
      current[0];
    if (crossesLatitude && longitude < longitudeAtLatitude) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function selectPolishInfo(value: unknown): Record<string, unknown> {
  const infos = asArray(value).map(asRecord);
  return (
    infos.find((info) => asString(info.language).toLowerCase() === "pl-pl") ??
    infos[0] ??
    {}
  );
}

function mapAlertCategory(event: string): AlertCategory {
  const normalizedEvent = event.toLowerCase();
  if (normalizedEvent.includes("thunder") || normalizedEvent.includes("burz")) {
    return "storm";
  }
  if (normalizedEvent.includes("wind") || normalizedEvent.includes("wiatr")) {
    return "wind";
  }
  if (normalizedEvent.includes("flood") || normalizedEvent.includes("powodzi")) {
    return "flood";
  }
  if (normalizedEvent.includes("heat") || normalizedEvent.includes("upa")) {
    return "heat";
  }
  if (normalizedEvent.includes("cold") || normalizedEvent.includes("mróz")) {
    return "cold";
  }
  return "other";
}

function mapSeverity(value: unknown): AlertSeverity {
  const severity = asString(value).toLowerCase();
  if (severity === "extreme" || severity === "severe" || severity === "moderate" || severity === "minor") {
    return severity;
  }
  return "unknown";
}

function optionalString<Key extends string>(key: Key, value: unknown): Partial<Record<Key, string>> {
  const stringValue = asString(value);
  return stringValue === "" ? {} : { [key]: stringValue } as Partial<Record<Key, string>>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function asString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function asCoordinate(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || typeof value[0] !== "number" || typeof value[1] !== "number") {
    return undefined;
  }
  return [value[0], value[1]];
}

function ensureSuccessful(response: Response): void {
  if (!response.ok) {
    throw new Error(`MeteoAlarm returned HTTP ${response.status}`);
  }
}
