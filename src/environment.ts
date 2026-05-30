import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvironmentFile(environmentFilePath = resolve(".env")): void {
  if (existsSync(environmentFilePath)) {
    process.loadEnvFile(environmentFilePath);
  }
}
