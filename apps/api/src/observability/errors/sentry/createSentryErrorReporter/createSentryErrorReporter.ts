import * as Sentry from "@sentry/node";

import type { ErrorReporter } from "../../types";
import { redactQueryParams } from "../../utils/redactQueryParams/redactQueryParams";

/**
 * Errors to Sentry. Tracing is off: traces go through OpenTelemetry
 * (observability/otel.mjs), and Sentry doesn't register a tracer provider of
 * its own. Sentry's default integrations also report uncaught exceptions and
 * unhandled rejections.
 *
 * Reports carry the error, its stack and the ids set in report(); nothing a
 * user typed or sent. Sentry collects more by default, so it's turned off:
 * cookies, headers (except user-agent), request and response bodies, query
 * parameters (tRPC queries put their input there), database query values and
 * local variables in stack frames. Query values in error messages are
 * redacted before sending.
 */
export function createSentryErrorReporter({ dsn, environment, release }: {
    dsn: string;
    environment: string;
    release?: string;
}): ErrorReporter {
    Sentry.init({
        dsn,
        environment,
        release,
        // Its module hooks only record spans, and Nitro's bundle can't load them anyway.
        enableRuntimeChannelInjection: false,
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: { request: { allow: ["user-agent"] }, response: false },
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            queues: false,
            stackFrameVariables: false,
        },
        beforeSend(event) {
            for (const exception of event.exception?.values ?? []) {
                if (exception.value) {
                    exception.value = redactQueryParams(exception.value);
                }
            }
            return event;
        },
    });
    return {
        report({ error, context }) {
            Sentry.withScope((scope) => {
                if (context?.userId) {
                    scope.setUser({ id: context.userId });
                }
                if (context?.requestId) {
                    scope.setTag("request_id", context.requestId);
                }
                if (context?.procedure) {
                    scope.setTag("procedure", context.procedure);
                }
                if (context?.method || context?.path) {
                    scope.setContext("request", { method: context.method, path: context.path });
                }
                Sentry.captureException(error);
            });
        },
        async flush({ timeoutMs }) {
            await Sentry.flush(timeoutMs);
        },
    };
}
