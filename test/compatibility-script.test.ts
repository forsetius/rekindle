import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const compatibilityScript = readFileSync(resolve("public/assets/compatibility.js"), "utf8");

test("rotates a portrait viewport into an emulated landscape layout", () => {
  const { viewportStyle } = runCompatibilityScript({
    innerHeight: 1024,
    innerWidth: 758
  });

  assert.deepEqual(viewportStyle, {
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
  const { viewportStyle } = runCompatibilityScript({
    innerHeight: 758,
    innerWidth: 1024
  });

  assert.deepEqual(viewportStyle, {});
});

test("forces and remembers landscape layout when requested in the URL", () => {
  const { document, viewportStyle } = runCompatibilityScript({
    innerHeight: 758,
    innerWidth: 1024,
    search: "?landscape=1"
  });

  assert.equal(viewportStyle.webkitTransform, "rotate(90deg)");
  assert.match(document.cookie, /rekindleLandscape=1/);
});

test("binds touch navigation without visible HTML links", () => {
  const navigationElement = {
    getAttribute(name: string): string | null {
      return name === "data-href" ? "/weather" : null;
    },
    onclick: (): void => {}
  };
  const { window } = runCompatibilityScript({
    innerHeight: 758,
    innerWidth: 1024,
    navigationElements: [navigationElement]
  });

  navigationElement.onclick();

  assert.equal(window.location.href, "/weather");
});

function runCompatibilityScript(options: {
  innerHeight: number;
  innerWidth: number;
  navigationElements?: Array<{ getAttribute(name: string): string | null; onclick: () => void }>;
  search?: string;
}): {
  document: { cookie: string };
  viewportStyle: Record<string, string>;
  window: { location: { href: string; search: string } };
} {
  const viewportStyle: Record<string, string> = {};
  const document = {
    body: { style: {} },
    cookie: "",
    documentElement: {
      clientHeight: options.innerHeight,
      clientWidth: options.innerWidth,
      style: {}
    },
    getElementById: () => ({ style: viewportStyle }),
    getElementsByTagName: () => options.navigationElements ?? []
  };
  const window = {
    innerHeight: options.innerHeight,
    innerWidth: options.innerWidth,
    location: { href: "", search: options.search ?? "" },
    screen: { height: options.innerHeight, width: options.innerWidth }
  };

  runInNewContext(compatibilityScript, {
    document,
    window
  });

  return { document, viewportStyle, window };
}
