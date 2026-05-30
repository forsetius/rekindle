import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const compatibilityScript = readFileSync(resolve("public/assets/compatibility.js"), "utf8");

test("rotates a portrait viewport into an emulated landscape layout", () => {
  const { runTimeouts, viewportStyle } = runCompatibilityScript({
    innerHeight: 1024,
    innerWidth: 758
  });
  runTimeouts();

  assert.deepEqual(viewportStyle, {
    position: "absolute",
    top: "0",
    left: "758px",
    width: "1024px",
    height: "758px",
    display: "block",
    visibility: "visible",
    webkitTransformOrigin: "0 0",
    transformOrigin: "0 0",
    webkitTransform: "rotate(90deg)",
    transform: "rotate(90deg)"
  });
});

test("leaves an existing landscape viewport unchanged", () => {
  const { runTimeouts, viewportStyle } = runCompatibilityScript({
    innerHeight: 758,
    innerWidth: 1024
  });
  runTimeouts();

  assert.deepEqual(viewportStyle, {
    display: "block",
    visibility: "visible"
  });
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

test("uses document dimensions when the Kindle browser reports zero window dimensions", () => {
  const { viewportStyle } = runCompatibilityScript({
    innerHeight: 0,
    innerWidth: 0,
    rootHeight: 897,
    rootWidth: 758,
    screenHeight: 1024,
    screenWidth: 758,
    search: "?landscape=1"
  });

  assert.equal(viewportStyle.left, "758px");
  assert.equal(viewportStyle.width, "897px");
  assert.equal(viewportStyle.height, "758px");
});

test("recalculates the rotated layout after the browser viewport stabilizes", () => {
  const { document, runTimeouts, viewportStyle } = runCompatibilityScript({
    innerHeight: 0,
    innerWidth: 0,
    rootHeight: 300,
    rootWidth: 758,
    screenHeight: 1024,
    screenWidth: 758,
    search: "?landscape=1"
  });

  assert.equal(viewportStyle.width, "300px");
  document.documentElement.clientHeight = 897;
  runTimeouts();
  assert.equal(viewportStyle.width, "897px");
  assert.equal(viewportStyle.visibility, "visible");
});

test("keeps the viewport hidden until the delayed layout refresh", () => {
  const { runTimeouts, viewportStyle } = runCompatibilityScript({
    innerHeight: 0,
    innerWidth: 0,
    rootHeight: 897,
    rootWidth: 758,
    screenHeight: 1024,
    screenWidth: 758,
    search: "?landscape=1"
  });

  assert.equal(viewportStyle.visibility, "hidden");
  runTimeouts();
  assert.equal(viewportStyle.visibility, "visible");
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
  rootHeight?: number;
  rootWidth?: number;
  screenHeight?: number;
  screenWidth?: number;
  search?: string;
}): {
  document: { cookie: string; documentElement: { clientHeight: number; clientWidth: number } };
  runTimeouts(): void;
  viewportStyle: Record<string, string>;
  window: { location: { href: string; search: string } };
} {
  const viewportStyle: Record<string, string> = { visibility: "hidden" };
  const timeoutCallbacks: Array<() => void> = [];
  const document = {
    body: { style: {} },
    cookie: "",
    documentElement: {
      clientHeight: options.rootHeight ?? options.innerHeight,
      clientWidth: options.rootWidth ?? options.innerWidth,
      style: {}
    },
    getElementById: () => ({ style: viewportStyle }),
    getElementsByTagName: () => options.navigationElements ?? []
  };
  const window = {
    innerHeight: options.innerHeight,
    innerWidth: options.innerWidth,
    location: { href: "", search: options.search ?? "" },
    setTimeout(callback: () => void): void {
      timeoutCallbacks.push(callback);
    },
    screen: {
      height: options.screenHeight ?? options.innerHeight,
      width: options.screenWidth ?? options.innerWidth
    }
  };

  runInNewContext(compatibilityScript, {
    document,
    window
  });

  return {
    document,
    runTimeouts(): void {
      for (const callback of timeoutCallbacks) {
        callback();
      }
    },
    viewportStyle,
    window
  };
}
