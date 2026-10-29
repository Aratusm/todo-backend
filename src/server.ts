import "dotenv/config";
import { createApp } from "./app.js";
import { createPool } from "./config/database.js";

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const jwtDurationPattern = /^(\d+)(ms|s|m|h|d|w|y)?$/;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("Set JWT_SECRET to a secret with at least 32 characters.");
}

function getJwtExpirationSeconds(value: string | undefined) {
  const configuredValue = value || "1h";
  const match = jwtDurationPattern.exec(configuredValue);
  if (!match) {
    throw new Error("JWT_EXPIRES_IN must be a number followed by ms, s, m, h, d, w, or y.");
  }

  const amount = Number(match[1]);
  const unit = match[2] || "s";
  const multiplier: Record<string, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
    w: 7 * 24 * 60 * 60,
    y: 365 * 24 * 60 * 60,
  };
  const seconds = amount * multiplier[unit];
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("JWT_EXPIRES_IN must be greater than zero.");
  }
  return seconds;
}

const pool = createPool();
const frontendOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const app = createApp({
  pool,
  jwtSecret,
  jwtExpiresIn: getJwtExpirationSeconds(process.env.JWT_EXPIRES_IN),
  frontendOrigins,
});
const server = app.listen(port, () => {
  console.log(`Todo API listening on http://localhost:${port}`);
});

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  server.close((error) => {
    if (error) {
      console.error("Failed to close the HTTP server:", error);
      process.exitCode = 1;
    }
    void pool.end().catch((poolError: unknown) => {
      console.error("Failed to close the MySQL pool:", poolError);
      process.exitCode = 1;
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
