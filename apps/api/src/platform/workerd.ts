import { rootLogger } from "../observability";
import { createBindingRateLimiter } from "./cloudflare/limiters/createBindingRateLimiter/createBindingRateLimiter";
import { setUpCloudflare } from "./cloudflare/setUpCloudflare/setUpCloudflare";
import { cloudflareEnv, hyperdriveConnectionString } from "./cloudflare/utils/cloudflareEnv/cloudflareEnv";
import type { Platform } from "./types";

/**
 * Cloudflare Workers (workerd): nothing runs between requests, connections
 * belong to one request (each gets its own, through Hyperdrive), and
 * per-minute rate limits are the Rate Limiting bindings. Everything
 * Cloudflare-only is in ./cloudflare.
 */
export const platform: Platform = {
    name: "workerd",
    databasePerRequest: true,
    runsBetweenRequests: false,
    requestDatabaseUrl: () => hyperdriveConnectionString(),
    createPerMinuteRateLimiter: () => createBindingRateLimiter({ env: cloudflareEnv, logger: rootLogger }),
    setUp: setUpCloudflare,
};
