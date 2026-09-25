import pino from 'pino'
import { trace, isSpanContextValid } from '@opentelemetry/api'

export interface AppLogger {
    info(obj: Record<string, unknown>, msg?: string): void;
    warn(obj: Record<string, unknown>, msg?: string): void;
    error(obj: Record<string, unknown>, msg?: string): void;
    debug(obj: Record<string, unknown>, msg?: string): void;
    child(bindings: Record<string, unknown>): AppLogger;
    setBindings(bindings: Record<string, unknown>): void;
}

const isProduction = process.env.NODE_ENV === "production";

export const rootLogger = pino({
    level: process.env.LOG_LEVEL || "info",
    // Format local logs cleanly; output JSON in production
    transport: !isProduction
        ? {
            target: "pino-pretty",
            options: { colorize: true },
        }
        : undefined,

    // Inject active OpenTelemetry context into every log payload.
    // Reads the active span directly via the API rather than relying on
    // instrumentation-pino's module patch, which doesn't reach loggers
    // constructed inside Vite's SSR dev module runner.
    mixin() {
        const activeSpan = trace.getActiveSpan();
        if (!activeSpan) return {};

        const spanContext = activeSpan.spanContext();
        if (!isSpanContextValid(spanContext)) return {};

        return {
            trace_id: spanContext.traceId,
            trace_flags: `0${spanContext.traceFlags.toString(16)}`,
            span_id: spanContext.spanId,
            spanName: (activeSpan as any).name,
            // New Relic log-trace correlation looks for these dotted keys
            "trace.id": spanContext.traceId,
            "span.id": spanContext.spanId,
        };
    },

    redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "token",
        "accessToken",
        "refreshToken",
    ],
});


// export const appLogger: AppLogger = rootLogger;

// export function createRequestAppLogger<T extends Record<string, unknown>>(requestId: string, extra?: T): AppLogger {
//     return rootLogger.child({ requestId, ...extra })
// }