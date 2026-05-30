import { createServer } from "node:http";
import { resolve } from "node:path";
import { createRequestHandler } from "./app.js";
import { loadConfig } from "./config.js";
import { loadEnvironmentFile } from "./environment.js";
import { DataService } from "./services/data-service.js";

loadEnvironmentFile();
const config = loadConfig(process.env);
const dataService = new DataService(config);
dataService.start();

const server = createServer(
  createRequestHandler({
    publicDirectory: resolve("public"),
    snapshotProvider: dataService
  })
);

server.listen(config.port, () => {
  console.log(`ReKindle is listening on http://localhost:${config.port}`);
});

function shutdown(): void {
  dataService.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
