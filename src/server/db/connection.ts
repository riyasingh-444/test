import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/config/env";
import { childLogger } from "@/lib/logger";

const log = childLogger("db");

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Reuse the connection across hot reloads and serverless invocations.
const globalForMongoose = globalThis as unknown as { __rivyaMongoose?: Cache };
const cache: Cache = (globalForMongoose.__rivyaMongoose ??= { conn: null, promise: null });

// Unknown filter paths are dropped. Operator injection is prevented at the HTTP boundary:
// every request body/query is zod-validated and stripped of `$`/`.` keys (see server/http/sanitize).
mongoose.set("strictQuery", true);

export async function connectDB(uri: string = env().MONGODB_URI): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
        autoIndex: env().NODE_ENV !== "production",
      })
      .then((m) => {
        log.info("MongoDB connected");
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        log.error({ err }, "MongoDB connection failed");
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
