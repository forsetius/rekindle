export interface AppConfig {
  port: number;
  locationName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  countryCode: string;
  meteoalarmEmmaId: string;
  meteoalarmEdrToken?: string;
  customFooterMessage?: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const port = readOptionalNumber(environment, "PORT") ?? 3000;
  const latitude = readRequiredNumber(environment, "LOCATION_LATITUDE");
  const longitude = readRequiredNumber(environment, "LOCATION_LONGITUDE");

  return {
    port,
    locationName: readRequired(environment, "LOCATION_NAME"),
    latitude,
    longitude,
    timeZone: readRequired(environment, "TIME_ZONE"),
    countryCode: readOptional(environment, "COUNTRY_CODE") ?? "PL",
    meteoalarmEmmaId: readRequired(environment, "METEOALARM_EMMA_ID"),
    ...optionalProperty("meteoalarmEdrToken", readOptional(environment, "METEOALARM_EDR_TOKEN")),
    ...optionalProperty("customFooterMessage", readOptional(environment, "CUSTOM_FOOTER_MESSAGE"))
  };
}

function readRequired(environment: NodeJS.ProcessEnv, key: string): string {
  const value = readOptional(environment, key);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readRequiredNumber(environment: NodeJS.ProcessEnv, key: string): number {
  const value = readRequired(environment, key);
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return numberValue;
}

function readOptionalNumber(environment: NodeJS.ProcessEnv, key: string): number | undefined {
  const value = readOptional(environment, key);
  if (value === undefined) {
    return undefined;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return numberValue;
}

function readOptional(environment: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = environment[key]?.trim();
  return value === "" ? undefined : value;
}

function optionalProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<Key, Value>>);
}
