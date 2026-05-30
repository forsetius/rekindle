import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const compatibilityScript = readFileSync(resolve("public/assets/compatibility.js"), "utf8");

test("rotates a portrait viewport into an emulated landscape layout", () => {
  const style: Record<string, string> = {};

  runInNewContext(compatibilityScript, {
    document: { body: { style } },
    window: { innerHeight: 1024, innerWidth: 758 }
  });

  assert.deepEqual(style, {
    position: "absolute",
    top: "0",
    left: "758px",
    width: "1024px",
    height: "758px",
    webkitTransformOrigin: "0 0",
    transformOrigin: "0 0",
    webkitTransform: "rotate(90deg)",
    transform: "rotate(90deg)"
  });
});

test("leaves an existing landscape viewport unchanged", () => {
  const style: Record<string, string> = {};

  runInNewContext(compatibilityScript, {
    document: { body: { style } },
    window: { innerHeight: 758, innerWidth: 1024 }
  });

  assert.deepEqual(style, {});
});
