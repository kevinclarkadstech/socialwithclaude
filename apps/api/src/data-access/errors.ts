import { DrizzleQueryError } from "drizzle-orm";

export class UsernameTakenError extends Error {
    constructor(username: string) {
        super(`Username "${username}" is taken`);
        this.name = "UsernameTakenError";
    }
}

export class ProfileAlreadyExistsError extends Error {
    constructor(userId: string) {
        super(`User ${userId} already has a profile`);
        this.name = "ProfileAlreadyExistsError";
    }
}

/** Returns the constraint name if `err` is a Postgres unique violation (23505). */
export function getUniqueViolationConstraint(err: unknown): string | null {
    const cause = err instanceof DrizzleQueryError ? err.cause : err;
    if (
        cause &&
        typeof cause === "object" &&
        "code" in cause &&
        cause.code === "23505" &&
        "constraint" in cause &&
        typeof cause.constraint === "string"
    ) {
        return cause.constraint;
    }
    return null;
}
