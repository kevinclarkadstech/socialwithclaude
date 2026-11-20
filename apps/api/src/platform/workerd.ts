import type { Platform } from "./types";

/** Cloudflare Workers (workerd): nothing runs between requests, and connections belong to one request. */
export const platform: Platform = { name: "workerd", databasePerRequest: true, runsBetweenRequests: false };
