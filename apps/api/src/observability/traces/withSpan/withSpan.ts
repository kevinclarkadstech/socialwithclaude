import {
    SpanStatusCode,
    trace,
} from "@opentelemetry/api"

type SpanOptions = {
    attributes?: Record<string, string | number | boolean>
}
const appTracer = trace.getTracer("my-api");


export async function withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: SpanOptions,
): Promise<T> {

    return appTracer.startActiveSpan(name, async (span) => {
        try {
            if (options?.attributes) {
                span.setAttributes(options.attributes)
            }

            return await fn()
        } catch (error) {
            span.recordException(error as Error)

            span.setStatus({
                code: SpanStatusCode.ERROR,
            })

            throw error
        } finally {
            span.end()
        }
    })
}