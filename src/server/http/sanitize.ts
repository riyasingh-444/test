/**
 * Strip keys that could be interpreted as MongoDB operators or dotted paths
 * from untrusted input. Applied to every JSON body and query before validation.
 */
export function sanitizeInput<T>(value: T, depth = 0): T {
  if (depth > 20) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeInput(v, depth + 1)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("$") || k.includes(".") || k === "__proto__" || k === "constructor" || k === "prototype") {
        continue;
      }
      out[k] = sanitizeInput(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
