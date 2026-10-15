import { trace, isSpanContextValid } from '@opentelemetry/api';
import {
    getContext,
} from 'hono/context-storage';
import pinoPretty from "pino-pretty";
import { createLogger, type AppLogger } from '@myapp/shared/observability';

const isProduction = process.env.NODE_ENV === "production";
export const rootLogger: AppLogger = createLogger({
    destinationStream: !isProduction ? pinoPretty({ colorize: true }) : undefined,
    level: isProduction ? "info" : "debug",
    injectAdditionalProperties: () => {
        const context = getContext();
        console.log(context.get('requestId'))
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
    }
});
