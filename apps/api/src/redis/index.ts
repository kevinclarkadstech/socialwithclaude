import { createClient } from "redis";
import { serverConfig } from "../config";
import { rootLogger } from "../observability";

/**
 * The shared Redis connection (rate-limit counters). It reconnects on its own;
 * while it's down, commands fail straight away rather than queueing, so the
 * API carries on without it (see rate-limiting).
 */
export const redis = createClient({
    url: serverConfig.REDIS_URL,
    disableOfflineQueue: true,
    socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
});

let lastErrorLoggedAt = 0;
redis.on("error", (err: unknown) => {
    // A dropped connection errors on every reconnect attempt: log it at most once a minute.
    if (Date.now() - lastErrorLoggedAt > 60_000) {
        lastErrorLoggedAt = Date.now();
        rootLogger.error("Redis connection error", { err });
    }
});

redis.connect().catch(() => {
    // Logged by the error handler above; the client keeps retrying.
});

/** Whether Redis answers, for the readiness check. */
export async function isRedisReachable(): Promise<boolean> {
    try {
        await redis.ping();
        return true;
    } catch {
        return false;
    }
}

/** Closes the connection on shutdown. */
export async function closeRedis() {
    if (redis.isOpen) {
        await redis.close();
    }
}
