import { onWorkers, serverConfig } from "../../config";
import { createDisabledErrorReporter } from "./disabled/createDisabledErrorReporter/createDisabledErrorReporter";
import { createSentryErrorReporter } from "./sentry/createSentryErrorReporter/createSentryErrorReporter";
import type { ErrorReporter } from "./types";

export type { ErrorReportContext, ErrorReporter } from "./types";
export { reportingFailures } from "./utils/reportingFailures/reportingFailures";

if (serverConfig.SENTRY_DSN && onWorkers) {
    // @sentry/node starts timers when it's set up, which Workers forbid outside a request (the Worker
    // wouldn't start). Reporting on Workers needs @sentry/cloudflare: until then, nothing is reported there.
    console.warn("SENTRY_DSN is ignored on Workers for now: errors aren't reported to Sentry (they're still in the Worker's logs)");
}

/** Where unexpected errors are reported: Sentry when SENTRY_DSN is set (not on Workers yet). */
export const errorReporter: ErrorReporter = serverConfig.SENTRY_DSN && !onWorkers
    ? createSentryErrorReporter({
        dsn: serverConfig.SENTRY_DSN,
        environment: serverConfig.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
        release: serverConfig.SENTRY_RELEASE,
    })
    : createDisabledErrorReporter();
