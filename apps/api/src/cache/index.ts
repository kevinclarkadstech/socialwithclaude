import { createClient } from "redis";
import { serverConfig } from "../config";
import { rootLogger } from "../observability";

/**
 * The shared cache: a Redis connection, used for rate-limit counters (see
 * rate-limiting/createRedisRateLimiter). It reconnects on its own; while it's
 * down, commands fail straight away rather than queueing, so the API carries
 * on without it.
 */
export const cache = createClient({
    url: serverConfig.REDIS_URL,
    disableOfflineQueue: true,
    socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
});

let lastErrorLoggedAt = 0;
cache.on("error", (err: unknown) => {
    // A dropped connection errors on every reconnect attempt: log it at most once a minute.
    if (Date.now() - lastErrorLoggedAt > 60_000) {
        lastErrorLoggedAt = Date.now();
        rootLogger.error("Cache connection error", { err });
    }
});

cache.connect().catch(() => {
    // Logged by the error handler above; the client keeps retrying.
});

export type Cache = typeof cache;

/** Whether the cache answers, for the readiness check. */
export async function isCacheReachable(): Promise<boolean> {
    try {
        await cache.ping();
        return true;
    } catch {
        return false;
    }
}

/** Closes the connection on shutdown. */
export async function closeCache() {
    if (cache.isOpen) {
        await cache.close();
    }
}
