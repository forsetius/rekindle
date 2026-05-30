import assert from "node:assert/strict";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import { createRequestHandler } from "../src/app.js";
import { createSnapshot } from "./support/snapshot.js";

const publicDirectory = resolve("public");

test("serves HTML pages, health JSON and static assets", async (testingContext) => {
  const handler = createRequestHandler({
    publicDirectory,
    snapshotProvider: {
      createSnapshot,
      createHealthSnapshot: () => ({
        status: "ok",
        sources: {
          weather: { hasData: true, refreshInProgress: false },
          airQuality: { hasData: true, refreshInProgress: false },
          alerts: { hasData: true, refreshInProgress: false }
        }
      })
    }
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  testingContext.after(() => server.close());
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}`;

  for (const pathname of ["/", "/weather", "/air-quality", "/alerts", "/calendar"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  }

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json() as { status: string }).status, "ok");

  const cssResponse = await fetch(`${baseUrl}/assets/styles.css`);
  assert.equal(cssResponse.status, 200);
  assert.match(cssResponse.headers.get("content-type") ?? "", /text\/css/);
  const css = await cssResponse.text();
  assert.doesNotMatch(css, /display:\s*(flex|grid)/);
  assert.doesNotMatch(css, /var\(--/);
  assert.match(css, /a:link, a:visited, a:hover, a:active \{[^}]*text-decoration: none !important;/);

  const compatibilityScriptResponse = await fetch(`${baseUrl}/assets/compatibility.js`);
  assert.equal(compatibilityScriptResponse.status, 200);
  assert.match(compatibilityScriptResponse.headers.get("content-type") ?? "", /text\/javascript/);
  const compatibilityScript = await compatibilityScriptResponse.text();
  assert.match(compatibilityScript, /window\.innerHeight/);
  assert.match(compatibilityScript, /window\.innerWidth/);
  assert.match(compatibilityScript, /webkitTransform/);

  const iconResponse = await fetch(`${baseUrl}/assets/icons/storm.png`);
  assert.equal(iconResponse.status, 200);
  assert.equal(iconResponse.headers.get("content-type"), "image/png");
  const icon = new Uint8Array(await iconResponse.arrayBuffer());
  assert.equal(icon[25], 4);
});

test("returns 404 for an unknown route", async (testingContext) => {
  const server = createServer(
    createRequestHandler({
      publicDirectory,
      snapshotProvider: {
        createSnapshot,
        createHealthSnapshot: () => ({
          status: "ok",
          sources: {
            weather: { hasData: false, refreshInProgress: false },
            airQuality: { hasData: false, refreshInProgress: false },
            alerts: { hasData: false, refreshInProgress: false }
          }
        })
      }
    })
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  testingContext.after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");
  const response = await fetch(`http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}/unknown`);

  assert.equal(response.status, 404);
});
