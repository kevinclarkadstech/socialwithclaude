import type { ErrorReporter } from "../../types";

/** Without SENTRY_DSN (e.g. locally): nothing is sent. Unexpected errors are still logged where they're caught. */
export function createDisabledErrorReporter(): ErrorReporter {
    return {
        report() {},
        async flush() {},
    };
}
