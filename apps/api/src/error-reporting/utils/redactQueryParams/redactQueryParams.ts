/**
 * Drizzle's query errors end with the bound values ("Failed query: …\nparams: a@b.com,…"),
 * which can be anyone's data. The query itself is kept, so the report still says what failed.
 */
export function redactQueryParams(message: string): string {
    return message.replace(/\nparams: [\s\S]*$/, "\nparams: [redacted]");
}
