import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import mongoose from "mongoose";
import type { Role } from "@/lib/constants";
import { childLogger } from "@/lib/logger";
import { connectDB } from "@/server/db/connection";
import { getCurrentUser, type AuthUser } from "@/server/auth/current-user";
import { AppError, errors } from "./errors";
import { sanitizeInput } from "./sanitize";
import { clientIp, rateLimit, RATE_LIMITS } from "./rate-limit";

const log = childLogger("http");

/**
 * Standard response envelope used by every endpoint (web + future mobile app):
 *   success → { data, meta? }
 *   failure → { error: { code, message, details? } }
 */
export type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };
export type ApiFailure = { error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>(meta ? { data, meta } : { data }, init);
}

export function fail(err: AppError) {
  return NextResponse.json<ApiFailure>(
    { error: { code: err.code, message: err.message, details: err.details } },
    { status: err.status },
  );
}

type AuthMode = "public" | "optional" | "required";

type Ctx<Q, B, P, A extends AuthMode> = {
  req: NextRequest;
  query: Q;
  body: B;
  params: P;
  user: A extends "required" ? AuthUser : AuthUser | null;
  ip: string;
};

type Options<QS extends ZodType | undefined, BS extends ZodType | undefined, A extends AuthMode> = {
  auth?: A;
  roles?: Role[];
  query?: QS;
  body?: BS;
  rateLimit?: keyof typeof RATE_LIMITS;
};

type Infer<S> = S extends ZodType ? z.infer<S> : undefined;

/**
 * Wraps a route handler with: DB connection, auth/role enforcement, rate limiting,
 * input sanitisation + zod validation, and uniform error mapping.
 */
export function api<
  P extends Record<string, string> = Record<string, never>,
  QS extends ZodType | undefined = undefined,
  BS extends ZodType | undefined = undefined,
  A extends AuthMode = "public",
>(
  options: Options<QS, BS, A>,
  handler: (ctx: Ctx<Infer<QS>, Infer<BS>, P, A>) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    const started = Date.now();
    try {
      const ip = clientIp(req);
      assertSameOrigin(req);
      if (options.rateLimit) {
        await rateLimit(`${options.rateLimit}:${ip}:${req.nextUrl.pathname}`, RATE_LIMITS[options.rateLimit]);
      }

      await connectDB();

      const authMode: AuthMode = options.auth ?? (options.roles ? "required" : "public");
      const user = authMode === "public" ? null : await getCurrentUser();
      if (authMode === "required" && !user) throw errors.unauthenticated();
      if (options.roles && (!user || !options.roles.includes(user.role))) throw errors.forbidden();

      const rawQuery = Object.fromEntries(
        [...req.nextUrl.searchParams.keys()].map((k) => {
          const all = req.nextUrl.searchParams.getAll(k);
          return [k, all.length > 1 ? all : all[0]];
        }),
      );
      const query = options.query ? parseOrThrow(options.query, sanitizeInput(rawQuery)) : undefined;

      let body: unknown = undefined;
      if (options.body) {
        let json: unknown;
        try {
          json = await req.json();
        } catch {
          throw errors.badRequest("Request body must be valid JSON");
        }
        body = parseOrThrow(options.body, sanitizeInput(json));
      }

      const params = sanitizeInput((await context.params) ?? ({} as P));

      const result = await handler({
        req,
        query: query as Infer<QS>,
        body: body as Infer<BS>,
        params,
        user: user as Ctx<Infer<QS>, Infer<BS>, P, A>["user"],
        ip,
      });
      return result instanceof Response ? result : ok(result);
    } catch (err) {
      return handleError(err, req, started);
    }
  };
}

/**
 * CSRF defence for cookie-authenticated writes: browsers always send `Origin` on
 * cross-site POST/PATCH/DELETE, so reject any whose origin differs from ours.
 * (Native mobile clients send no Origin and authenticate with bearer tokens.)
 */
function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw errors.forbidden("Cross-origin request blocked");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw errors.forbidden("Cross-origin request blocked");
  }
}

function parseOrThrow<S extends ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw errors.validation(z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

export function handleError(err: unknown, req: Request, started = Date.now()) {
  if (err instanceof AppError) {
    if (err.status >= 500) log.error({ err, path: new URL(req.url).pathname }, err.message);
    return fail(err);
  }
  if (err instanceof mongoose.Error.CastError) return fail(errors.notFound());
  if (err instanceof mongoose.Error.ValidationError) {
    return fail(errors.validation(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, [v.message]]))));
  }
  if ((err as { code?: number })?.code === 11000) return fail(errors.conflict("This already exists"));
  log.error({ err, path: new URL(req.url).pathname, ms: Date.now() - started }, "Unhandled API error");
  return fail(new AppError("INTERNAL", "Something went wrong. Please try again."));
}
