import pino, { type Logger as PinoLogger } from 'pino'
import pretty from 'pino-pretty'
import { trace, isSpanContextValid } from '@opentelemetry/api'

export interface LogErrorContext extends Record<string, unknown> {
    /** Root cause explanation. */
    why?: string;
    /** Actionable next step for whoever hits this. */
    fix?: string;
    /** Docs/reference URL. */
    link?: string;
}

export interface AppLogger {
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: LogErrorContext): void;
    debug(message: string, context?: Record<string, unknown>): void;
    child(bindings: Record<string, unknown>): AppLogger;
    setBindings(bindings: Record<string, unknown>): void;
}

const isProduction = process.env.NODE_ENV === "production";

const basePinoLogger = pino(
    {
        level: process.env.LOG_LEVEL || "info",

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
    },
    // Format local logs cleanly; output JSON in production. Piped through
    // directly (not via pino's `transport` option) so it runs in-process
    // instead of spawning a worker thread, which relies on `__dirname` to
    // locate its worker script and breaks once this file is bundled into a
    // single ESM file by Nitro's build.
    !isProduction ? pretty({ colorize: true }) : undefined,
);

// Wraps Pino with a message-first API instead of Pino's own
// (mergingObject, message) shape, so call sites and the AppLogger type
// don't depend on Pino's typings.
function wrapPinoLogger(pinoLogger: PinoLogger): AppLogger {
    return {
        info(message, context) {
            pinoLogger.info(context ?? {}, message);
        },
        warn(message, context) {
            pinoLogger.warn(context ?? {}, message);
        },
        error(message, context) {
            pinoLogger.error(context ?? {}, message);
        },
        debug(message, context) {
            pinoLogger.debug(context ?? {}, message);
        },
        child(bindings) {
            return wrapPinoLogger(pinoLogger.child(bindings));
        },
        setBindings(bindings) {
            pinoLogger.setBindings(bindings);
        },
    };
}

export const rootLogger: AppLogger = wrapPinoLogger(basePinoLogger);
