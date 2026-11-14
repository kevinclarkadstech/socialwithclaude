import { serverConfig } from "../../config";
import { createDisabledErrorReporter } from "./disabled/createDisabledErrorReporter/createDisabledErrorReporter";
import { createSentryErrorReporter } from "./sentry/createSentryErrorReporter/createSentryErrorReporter";
import type { ErrorReporter } from "./types";

export type { ErrorReportContext, ErrorReporter } from "./types";

/** Where unexpected errors are reported: Sentry when SENTRY_DSN is set. */
export const errorReporter: ErrorReporter = serverConfig.SENTRY_DSN
    ? createSentryErrorReporter({
        dsn: serverConfig.SENTRY_DSN,
        environment: serverConfig.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
        release: serverConfig.SENTRY_RELEASE,
    })
    : createDisabledErrorReporter();
