import { vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Minimal request-context shim for route handlers: `next/headers` reads from a
 * mutable header bag, and cookies set by handlers are captured in `cookieJar`.
 */
export const requestContext = {
  headers: new Headers(),
  cookieJar: new Map<string, string>(),
  reset() {
    this.headers = new Headers();
    this.cookieJar.clear();
  },
};

vi.mock("next/headers", () => ({
  headers: async () => requestContext.headers,
  cookies: async () => ({
    get: (name: string) => {
      const value = requestContext.cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    has: (name: string) => requestContext.cookieJar.has(name),
    set: (name: string, value: string) => void requestContext.cookieJar.set(name, value),
    delete: (arg: string | { name: string }) => void requestContext.cookieJar.delete(typeof arg === "string" ? arg : arg.name),
  }),
}));

type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;

export async function call<P>(
  handler: Handler<P>,
  opts: { method?: string; url?: string; body?: unknown; params?: Record<string, string>; token?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json", host: "localhost:3000" });
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`);
  requestContext.headers = headers;
  const req = new NextRequest(new URL(opts.url ?? "/api/test", "http://localhost:3000"), {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  const json = (await res.json()) as { data?: any; error?: { code: string; message: string; details?: any } };
  return { status: res.status, ...json };
}
