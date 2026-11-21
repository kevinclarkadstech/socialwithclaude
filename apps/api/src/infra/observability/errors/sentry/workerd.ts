import { waitUntil } from "cloudflare:workers";
import type { ErrorReporter } from "../types";
import { createSentryWorkersErrorReporter } from "./createSentryWorkersErrorReporter/createSentryWorkersErrorReporter";

/** Sentry on Cloudflare Workers (see package.json "imports" → "#sentry-error-reporter"). */
export function createSentryErrorReporter(options: { dsn: string; environment: string; release?: string }): ErrorReporter {
    return createSentryWorkersErrorReporter({ ...options, waitUntil });
}
