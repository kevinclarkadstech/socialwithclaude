import { createClient } from "redis";
import { rootLogger } from "../../../observability";
import type { Cache } from "../../types";

/**
 * A Cache over Redis. The connection reconnects on its own; while it's down,
 * commands fail straight away rather than queueing, so callers can carry on
 * without it.
 */
export function createRedisCache({ url }: { url: string }): Cache {
    const client = createClient({
        url,
        disableOfflineQueue: true,
        socket: {
            connectTimeout: 2000,
            reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
        },
    });

    let lastErrorLoggedAt = 0;
    client.on("error", (err: unknown) => {
        // A dropped connection errors on every reconnect attempt: log it at most once a minute.
        if (Date.now() - lastErrorLoggedAt > 60_000) {
            lastErrorLoggedAt = Date.now();
            rootLogger.error("Cache connection error", { err });
        }
    });
    client.connect().catch(() => {
        // Logged by the error handler above; the client keeps retrying.
    });

    return {
        async increment({ key, windowSeconds }) {
            // One round trip: the window starts with the first increment and isn't extended by later ones.
            const [count, , secondsLeft] = await client.multi()
                .incr(key)
                .expire(key, windowSeconds, "NX")
                .ttl(key)
                .execTyped();
            return { count, secondsLeft };
        },
        async isReachable() {
            try {
                await client.ping();
                return true;
            } catch {
                return false;
            }
        },
        async close() {
            if (client.isOpen) {
                await client.close();
            }
        },
    };
}
