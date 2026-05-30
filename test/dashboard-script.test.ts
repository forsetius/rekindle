import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const dashboardScript = readFileSync(resolve("public/assets/dashboard.js"), "utf8");

test("updates the clock at the next server minute boundary", () => {
  let currentEpoch = Date.parse("2026-05-30T13:45:30.000Z");
  let intervalCallback = (): void => {};
  const clock = {
    innerHTML: "",
    getAttribute(name: string): string {
      return {
        "data-server-epoch": `${currentEpoch}`,
        "data-hours": "15",
        "data-minutes": "45"
      }[name] ?? "";
    }
  };

  runInNewContext(dashboardScript, {
    Date: { now: () => currentEpoch },
    document: { getElementById: () => clock },
    window: {
      setInterval(callback: () => void): void {
        intervalCallback = callback;
      }
    }
  });

  assert.equal(clock.innerHTML, "15:45");
  currentEpoch += 31_000;
  intervalCallback();
  assert.equal(clock.innerHTML, "15:46");
});
