import "server-only";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { app: "rivya" },
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[redacted]",
  },
});

export function childLogger(module: string) {
  return logger.child({ module });
}
