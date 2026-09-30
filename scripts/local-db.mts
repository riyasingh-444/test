/**
 * Local development database (no Atlas account needed).
 *
 *   npm run db:local
 *
 * Starts a single-node MongoDB replica set (transactions work) on port 27027 and keeps
 * data in ./.local-db between runs. Point MONGODB_URI at the printed URI, then `npm run seed`.
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const dbPath = resolve(".local-db");
mkdirSync(dbPath, { recursive: true });

// MongoDB ships no Windows-on-ARM build; x64 runs under Windows 11 emulation.
const arch = process.platform === "win32" && process.arch === "arm64" ? "x64" : undefined;

const rs = await MongoMemoryReplSet.create({
  binary: arch ? { arch } : undefined,
  instanceOpts: [{ port: 27027, dbPath, storageEngine: "wiredTiger", launchTimeout: 120_000 }],
  replSet: { name: "rivya-local", count: 1 },
});

console.log(`\nLocal MongoDB ready:\n  MONGODB_URI=${rs.getUri("rivya")}\n\nData directory: ${dbPath}\nPress Ctrl+C to stop.\n`);

const stop = async () => {
  await rs.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
