import type { NitroApp } from "nitro/types";
import type { RateLimiter } from "../../rate-limiting";

/** What differs between the runtimes the API runs on (see package.json "imports" → "#platform"). */
export interface Platform {
    /** "node" (Node or Bun, a long-running server) or "workerd" (Cloudflare Workers). */
    name: "node" | "workerd";
    /**
     * Whether each request needs its own database client. On Workers a
     * connection can't be shared between requests, so each one opens its own
     * (through Hyperdrive, which keeps the real connections) and closes it after.
     * A long-running server keeps one pool for everything.
     */
    databasePerRequest: boolean;
    /** Whether the server runs long enough for timers between requests (the push delivery loop). */
    runsBetweenRequests: boolean;
    /** The connection string for a request's own database client, when databasePerRequest. */
    requestDatabaseUrl?: () => string;
    /** The per-minute rate limiter, when the runtime has its own (Workers' Rate Limiting binding); otherwise the cache's. */
    createPerMinuteRateLimiter?: () => RateLimiter;
    /** Sets up what the runtime needs at startup (Workers: Cron Triggers, the push queue). Called by a Nitro plugin. */
    setUp?: (nitroApp: Required<Pick<NitroApp, "hooks">>) => void;
}
