/**
 * A saved report as the reporter gets it back: without its snapshot, which
 * is for moderators. Strips it even when the report's type doesn't mention
 * it (e.g. a full report from the database passed off as the trimmed type).
 */
export function withoutSnapshot<Report extends object>(report: Report): Omit<Report, "snapshot"> {
    const { snapshot: _snapshot, ...rest } = report as Report & { snapshot?: unknown };
    return rest;
}
