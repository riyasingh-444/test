import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import mongoose from "mongoose";

process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-1234";
process.env.APP_URL ??= "http://localhost:3000";
process.env.LOG_LEVEL = "error";

beforeAll(async () => {
  const uri = inject("mongoUri");
  process.env.MONGODB_URI = uri;
  const { connectDB } = await import("@/server/db/connection");
  await connectDB(uri);
  await import("@/server/models");
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
