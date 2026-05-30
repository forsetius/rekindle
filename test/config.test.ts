import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

const requiredEnvironment = {
  LOCATION_NAME: "Warszawa",
  LOCATION_LATITUDE: "52.2297",
  LOCATION_LONGITUDE: "21.0122",
  TIME_ZONE: "Europe/Warsaw",
  METEOALARM_EMMA_ID: "PL1465"
};

test("loads required configuration and default values", () => {
  const config = loadConfig(requiredEnvironment);

  assert.equal(config.port, 3000);
  assert.equal(config.locationName, "Warszawa");
  assert.equal(config.countryCode, "PL");
  assert.equal(config.meteoalarmEmmaId, "PL1465");
  assert.equal(config.customFooterMessage, undefined);
});

test("rejects an incomplete configuration", () => {
  assert.throws(
    () =>
      loadConfig({
        ...requiredEnvironment,
        LOCATION_LONGITUDE: ""
      }),
    /LOCATION_LONGITUDE/
  );
});
