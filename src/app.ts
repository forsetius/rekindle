import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import type { HealthSnapshot, DashboardSnapshot } from "./services/data-service.js";
import {
  renderAirQualityPage,
  renderAlertsPage,
  renderCalendarPage,
  renderDashboard,
  renderWeatherPage
} from "./views/render.js";

export interface SnapshotProvider {
  createSnapshot(): DashboardSnapshot;
  createHealthSnapshot(): HealthSnapshot;
}

export interface RequestHandlerOptions {
  publicDirectory: string;
  snapshotProvider: SnapshotProvider;
}

export function createRequestHandler(
  options: RequestHandlerOptions
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    void handleRequest(options, request, response).catch((error: unknown) => {
      console.error(error);
      sendText(response, 500, "Internal Server Error");
    });
  };
}

async function handleRequest(
  options: RequestHandlerOptions,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  if (request.method !== "GET") {
    sendText(response, 405, "Method Not Allowed");
    return;
  }

  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname.startsWith("/assets/")) {
    await serveAsset(options.publicDirectory, pathname, response);
    return;
  }

  if (pathname === "/health") {
    sendJson(response, options.snapshotProvider.createHealthSnapshot());
    return;
  }

  const snapshot = options.snapshotProvider.createSnapshot();
  const html = renderPath(pathname, snapshot);
  if (html === undefined) {
    sendText(response, 404, "Not Found");
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(html);
}

function renderPath(pathname: string, snapshot: DashboardSnapshot): string | undefined {
  if (pathname === "/") return renderDashboard(snapshot);
  if (pathname === "/weather") return renderWeatherPage(snapshot);
  if (pathname === "/air-quality") return renderAirQualityPage(snapshot);
  if (pathname === "/alerts") return renderAlertsPage(snapshot);
  if (pathname === "/calendar") return renderCalendarPage(snapshot);
  return undefined;
}

async function serveAsset(
  publicDirectory: string,
  pathname: string,
  response: ServerResponse
): Promise<void> {
  const absolutePublicDirectory = resolve(publicDirectory);
  const assetPath = resolve(absolutePublicDirectory, `.${decodeURIComponent(pathname)}`);
  if (!assetPath.startsWith(`${absolutePublicDirectory}${sep}`)) {
    sendText(response, 404, "Not Found");
    return;
  }

  try {
    const content = await readFile(assetPath);
    response.writeHead(200, {
      "content-type": contentType(assetPath),
      "cache-control": "public, max-age=3600"
    });
    response.end(content);
  } catch (error: unknown) {
    if (isFileNotFound(error)) {
      sendText(response, 404, "Not Found");
      return;
    }
    throw error;
  }
}

function contentType(pathname: string): string {
  return {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png"
  }[extname(pathname)] ?? "application/octet-stream";
}

function sendJson(response: ServerResponse, value: unknown): void {
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value));
}

function sendText(response: ServerResponse, status: number, body: string): void {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}
