/** Postgres's unique_violation. */
const UNIQUE_VIOLATION = "23505";

type PgError = { code?: string; constraint?: string };

/**
 * The unique index or key `error` violated (e.g. "user_profiles_username_idx"),
 * or null for any other error. Drizzle wraps the driver's error, so it's
 * looked for in `cause` too.
 */
export function uniqueViolationConstraint(error: unknown): string | null {
    const candidates = [error, (error as { cause?: unknown } | null)?.cause] as (PgError | null | undefined)[];
    const pgError = candidates.find((candidate) => candidate?.code === UNIQUE_VIOLATION);
    return pgError ? pgError.constraint ?? "" : null;
}
