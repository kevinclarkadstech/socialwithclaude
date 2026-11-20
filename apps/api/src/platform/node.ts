import type { Platform } from "./types";

/** Node or Bun: one long-running server. */
export const platform: Platform = { name: "node", databasePerRequest: false, runsBetweenRequests: true };
