import type { CloudflareEnv } from "../../types";

/**
 * The Worker's env. Nitro's Cloudflare handler sets globalThis.__env__ to it
 * before every request, Cron Trigger and queue batch, so it's there whenever
 * the API's code runs (the same object each time).
 */
export function cloudflareEnv(): CloudflareEnv {
    const env = (globalThis as { __env__?: CloudflareEnv }).__env__;
    if (!env) {
        throw new Error("The Cloudflare env isn't set: this code only runs inside a request, Cron Trigger or queue batch on Workers");
    }
    return env;
}

/** The connection string for a request's own database client: Hyperdrive's (see the README's Cloudflare setup). */
export function hyperdriveConnectionString(env: CloudflareEnv = cloudflareEnv()): string {
    if (!env.HYPERDRIVE) {
        throw new Error("The HYPERDRIVE binding is missing: the API connects to Postgres through Hyperdrive on Workers (see wrangler.jsonc)");
    }
    return env.HYPERDRIVE.connectionString;
}
