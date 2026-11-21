/**
 * The parts of Cloudflare's runtime the API uses, typed here so nothing
 * depends on @cloudflare/workers-types. Names match the bindings in
 * apps/api/wrangler.jsonc.
 */

/** A Rate Limiting binding: counts `delta` units for `key`, approximately, per Cloudflare location. */
export interface RateLimitBinding {
    limit(args: { key: string; delta?: number }): Promise<{ success: boolean }>;
}

/** A Queues producer binding. */
export interface QueueBinding {
    send(body: unknown, options?: { delaySeconds?: number }): Promise<void>;
}

/** A Hyperdrive binding: a connection string for this request, to Hyperdrive's pooler. */
export interface HyperdriveBinding {
    connectionString: string;
}

/** The Worker's env: bindings, plus vars and secrets (which also arrive as process.env). */
export interface CloudflareEnv {
    HYPERDRIVE?: HyperdriveBinding;
    PUSH_QUEUE?: QueueBinding;
    [binding: string]: unknown;
}

/** What a Cron Trigger's handler gets (the parts used). */
export interface ScheduledController {
    cron: string;
}

/** What a queue consumer gets (the parts used). */
export interface MessageBatch {
    messages: readonly unknown[];
    ackAll(): void;
    retryAll(options?: { delaySeconds?: number }): void;
}
