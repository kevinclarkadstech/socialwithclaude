import { CloudflareClient } from "@sentry/cloudflare";
import { createStackParser, createTransport, dedupeIntegration, linkedErrorsIntegration, Scope, type Transport } from "@sentry/core";
import { nodeStackLineParser } from "@sentry/core/server";

import type { ErrorReporter } from "../../types";
import { redactQueryParams } from "../../utils/redactQueryParams/redactQueryParams";

/**
 * Errors to Sentry on Cloudflare Workers, through @sentry/cloudflare's
 * client (@sentry/node can't run there). The client is made on the first
 * report, inside a request: Workers forbid what setting one up does (timers,
 * random values) at startup. Each report is sent in the background
 * (`waitUntil`), so the response doesn't wait for it.
 *
 * Like the Node reporter, it sends the error, its stack and the ids set in
 * report(), nothing a user typed or sent: no integrations that collect
 * requests, and query values in error messages are redacted.
 */
export function createSentryWorkersErrorReporter({ dsn, environment, release, waitUntil, fetch = globalThis.fetch }: {
    dsn: string;
    environment: string;
    release?: string;
    /** Keeps the Worker running until a report is sent (cloudflare:workers' waitUntil). */
    waitUntil: (promise: Promise<unknown>) => void;
    fetch?: typeof globalThis.fetch;
}): ErrorReporter {
    let client: CloudflareClient | null = null;

    function getClient(): CloudflareClient {
        if (!client) {
            client = new CloudflareClient({
                dsn,
                environment,
                release,
                stackParser: createStackParser(nodeStackLineParser()),
                integrations: [dedupeIntegration(), linkedErrorsIntegration()],
                transport: (options): Transport => createTransport(options, async (request) => {
                    const response = await fetch(options.url, { method: "POST", body: request.body as RequestInit["body"], headers: options.headers });
                    return { statusCode: response.status };
                }),
                beforeSend(event) {
                    for (const exception of event.exception?.values ?? []) {
                        if (exception.value) {
                            exception.value = redactQueryParams(exception.value);
                        }
                    }
                    return event;
                },
            });
            client.init();
        }
        return client;
    }

    return {
        report({ error, context }) {
            const sentry = getClient();
            const scope = new Scope();
            scope.setClient(sentry);
            if (context?.userId) {
                scope.setUser({ id: context.userId });
            }
            if (context?.requestId) {
                scope.setTag("request_id", context.requestId);
            }
            if (context?.procedure) {
                scope.setTag("procedure", context.procedure);
            }
            if (context?.command) {
                scope.setTag("command", context.command);
            }
            if (context?.method || context?.path) {
                scope.setContext("request", { method: context.method, path: context.path });
            }
            scope.captureException(error);
            waitUntil(sentry.flush(2000));
        },
        async flush({ timeoutMs }) {
            await client?.flush(timeoutMs);
        },
    };
}
