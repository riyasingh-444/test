import { MongoMemoryReplSet } from "mongodb-memory-server";

/** One in-memory replica set for the whole run (replica set = transactions work). */
export default async function setup({ provide }: { provide: (key: string, value: string) => void }) {
  // MongoDB ships no Windows-on-ARM build; x64 runs under Windows 11 emulation.
  const arch = process.platform === "win32" && process.arch === "arm64" ? "x64" : undefined;
  const replSet = await MongoMemoryReplSet.create({
    binary: arch ? { arch } : undefined,
    instanceOpts: [{ launchTimeout: 90_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  provide("mongoUri", replSet.getUri("rivya-test"));
  return async () => {
    await replSet.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
