import { serverConfig } from "../../config";
import { createDisabledErrorReporter } from "./disabled/createDisabledErrorReporter/createDisabledErrorReporter";
// @sentry/node on Node or Bun, @sentry/cloudflare in the Workers build.
import { createSentryErrorReporter } from "#sentry-error-reporter";
import type { ErrorReporter } from "./types";

export type { ErrorReportContext, ErrorReporter } from "./types";
export { reportingFailures } from "./utils/reportingFailures/reportingFailures";

/** Where unexpected errors are reported: Sentry when SENTRY_DSN is set. */
export const errorReporter: ErrorReporter = serverConfig.SENTRY_DSN
    ? createSentryErrorReporter({
        dsn: serverConfig.SENTRY_DSN,
        environment: serverConfig.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
        release: serverConfig.SENTRY_RELEASE,
    })
    : createDisabledErrorReporter();
