/** What's known about where an error happened. Only ids: no emails, bodies or headers. */
export interface ErrorReportContext {
    requestId?: string;
    /** The signed-in user's id, so reports can be grouped by who was affected. */
    userId?: string;
    method?: string;
    path?: string;
    /** The tRPC procedure, e.g. "posts.createPost". */
    procedure?: string;
}

/**
 * Sends unexpected errors to an error tracker. The API only uses this
 * interface, so the tracker (Sentry today) can be swapped by writing another
 * implementation. Expected failures (validation, not found, forbidden) are
 * never reported: only what the client sees as "Something went wrong".
 */
export interface ErrorReporter {
    report(args: { error: unknown; context?: ErrorReportContext }): void;
    /** Waits for reports still being sent, on shutdown. */
    flush(args: { timeoutMs: number }): Promise<void>;
}
