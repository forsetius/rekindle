import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadEnvironmentFile } from "../src/environment.js";

test("loads variables from an existing environment file", (testingContext) => {
  const directory = mkdtempSync(join(tmpdir(), "rekindle-environment-"));
  const environmentFilePath = join(directory, ".env");
  const variableName = "REKINDLE_ENVIRONMENT_TEST";
  const previousValue = process.env[variableName];
  writeFileSync(environmentFilePath, `${variableName}=loaded-from-file\n`);
  delete process.env[variableName];

  testingContext.after(() => {
    if (previousValue === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = previousValue;
    }
    rmSync(directory, { recursive: true });
  });

  loadEnvironmentFile(environmentFilePath);

  assert.equal(process.env[variableName], "loaded-from-file");
});

test("does not require an environment file", () => {
  assert.doesNotThrow(() => loadEnvironmentFile("/missing/rekindle/.env"));
});
