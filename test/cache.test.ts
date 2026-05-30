import assert from "node:assert/strict";
import test from "node:test";
import { createCacheEntry, refreshCache } from "../src/services/cache.js";

test("keeps the last successful cache value after a refresh failure", async () => {
  const cache = createCacheEntry<string>();
  await refreshCache(cache, async () => "first", () => new Date("2026-05-30T09:00:00Z"));

  await assert.rejects(
    refreshCache(
      cache,
      async () => {
        throw new Error("network unavailable");
      },
      () => new Date("2026-05-30T10:00:00Z")
    ),
    /network unavailable/
  );

  assert.equal(cache.data, "first");
  assert.equal(cache.lastSuccessAt?.toISOString(), "2026-05-30T09:00:00.000Z");
  assert.equal(cache.lastError, "network unavailable");
});

test("shares an in-flight cache refresh", async () => {
  const cache = createCacheEntry<string>();
  let resolveFetch: ((value: string) => void) | undefined;
  const fetcher = () =>
    new Promise<string>((resolve) => {
      resolveFetch = resolve;
    });

  const firstRefresh = refreshCache(cache, fetcher);
  const secondRefresh = refreshCache(cache, fetcher);
  resolveFetch?.("value");

  assert.equal(await firstRefresh, "value");
  assert.equal(await secondRefresh, "value");
});
