"use client";

/**
 * Browser API client for /api/v1. Unwraps the `{ data, meta } | { error }` envelope,
 * transparently refreshes an expired session once, and throws typed ApiError on failure.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
  fieldError(field: string) {
    return this.details?.[field]?.[0];
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; query?: Record<string, string | number | boolean | undefined | null> };

let refreshing: Promise<boolean> | null = null;
async function refreshSession() {
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const url = new URL(`/api/v1${path}`, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const init: RequestInit = {
    ...opts,
    headers: { ...(opts.body !== undefined ? { "content-type": "application/json" } : {}), ...opts.headers },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  };

  let res: Response;
  try {
    res = await fetch(url, init);
    if (res.status === 401 && !path.startsWith("/auth/") && document.cookie.includes("rivya_session=")) {
      if (await refreshSession()) res = await fetch(url, init);
    }
  } catch {
    throw new ApiError(0, "NETWORK", "You appear to be offline. Check your connection and try again.");
  }

  const json = (await res.json().catch(() => null)) as
    | { data: T; meta?: Record<string, unknown> }
    | { error: { code: string; message: string; details?: Record<string, string[]> } }
    | null;
  if (!res.ok || !json || "error" in json) {
    const err = json && "error" in json ? json.error : { code: "INTERNAL", message: "Something went wrong" };
    throw new ApiError(res.status, err.code, err.message, "details" in err ? err.details : undefined);
  }
  return json;
}

export const api = {
  get: <T,>(path: string, query?: Options["query"]) => apiFetch<T>(path, { method: "GET", query }),
  post: <T,>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T,>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body: body ?? {} }),
  del: <T,>(path: string, body?: unknown) => apiFetch<T>(path, { method: "DELETE", body }),
};
