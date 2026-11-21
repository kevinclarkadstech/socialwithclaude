import type { ErrorReportContext, ErrorReporter } from "../../types";

/**
 * `run`, but a failure is also sent to the error tracker before it's
 * rethrown. For work whose failure the caller logs and carries on from (a
 * clean-up after a save), yet someone should still hear about, e.g. a
 * removed photo whose file is still public.
 */
export function reportingFailures<Args extends unknown[], R>({ reporter, context, run }: {
    reporter: ErrorReporter;
    context: ErrorReportContext;
    run: (...args: Args) => Promise<R>;
}): (...args: Args) => Promise<R> {
    return async (...args) => {
        try {
            return await run(...args);
        } catch (error) {
            reporter.report({ error, context });
            throw error;
        }
    };
}
