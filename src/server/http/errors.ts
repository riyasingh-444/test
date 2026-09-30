/** Typed application errors. Services throw these; the HTTP wrapper maps them to responses. */
export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SLOT_UNAVAILABLE"
  | "RATE_LIMITED"
  | "PAYMENT_ERROR"
  | "NOT_CONFIGURED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SLOT_UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  PAYMENT_ERROR: 402,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const errors = {
  badRequest: (msg = "Bad request", details?: unknown) => new AppError("BAD_REQUEST", msg, details),
  validation: (details: unknown, msg = "Please check the highlighted fields") =>
    new AppError("VALIDATION_ERROR", msg, details),
  unauthenticated: (msg = "Please sign in to continue") => new AppError("UNAUTHENTICATED", msg),
  forbidden: (msg = "You don't have access to this") => new AppError("FORBIDDEN", msg),
  notFound: (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`),
  conflict: (msg: string) => new AppError("CONFLICT", msg),
  slotUnavailable: (msg = "That time slot is no longer available") => new AppError("SLOT_UNAVAILABLE", msg),
  rateLimited: (msg = "Too many requests. Please try again shortly.") => new AppError("RATE_LIMITED", msg),
  payment: (msg: string) => new AppError("PAYMENT_ERROR", msg),
  notConfigured: (feature: string, envVars: string[]) =>
    new AppError("NOT_CONFIGURED", `${feature} is not configured on this server`, { requiredEnv: envVars }),
};
