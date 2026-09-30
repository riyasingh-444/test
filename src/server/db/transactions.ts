import "server-only";
import mongoose, { type ClientSession } from "mongoose";

/**
 * Run `fn` inside a MongoDB transaction, retrying on transient errors
 * (write conflicts between concurrent transactions surface as TransientTransactionError).
 * Requires a replica set — MongoDB Atlas always is; tests use an in-memory replica set.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(
        async () => {
          result = await fn(session);
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      );
      return result;
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 25));
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
}

function isTransient(err: unknown) {
  const e = err as { hasErrorLabel?: (l: string) => boolean; code?: number };
  return Boolean(
    e?.hasErrorLabel?.("TransientTransactionError") || e?.code === 112 /* WriteConflict */,
  );
}
