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

export class PostNotFoundError extends Error {
    constructor(postId: string) {
        super(`Post ${postId} not found`);
        this.name = "PostNotFoundError";
    }
}

export class NotPostAuthorError extends Error {
    constructor(postId: string, userId: string) {
        super(`User ${userId} is not the author of post ${postId}`);
        this.name = "NotPostAuthorError";
    }
}

/**
 * A client-supplied id is already used by a different record (another user's,
 * or a different kind of record). Retries of your own create don't raise this.
 */
export class IdConflictError extends Error {
    constructor(id: string) {
        super(`Id ${id} is already in use`);
        this.name = "IdConflictError";
    }
}

export class CannotReportOwnPostError extends Error {
    constructor(postId: string) {
        super(`Cannot report your own post ${postId}`);
        this.name = "CannotReportOwnPostError";
    }
}

export class CannotReportOwnCommentError extends Error {
    constructor(commentId: string) {
        super(`Cannot report your own comment ${commentId}`);
        this.name = "CannotReportOwnCommentError";
    }
}

export class ListingNotFoundError extends Error {
    constructor(postId: string) {
        super(`Listing ${postId} not found`);
        this.name = "ListingNotFoundError";
    }
}

export class CommentNotFoundError extends Error {
    constructor(commentId: string) {
        super(`Comment ${commentId} not found`);
        this.name = "CommentNotFoundError";
    }
}

export class NotCommentAuthorError extends Error {
    constructor(commentId: string, userId: string) {
        super(`User ${userId} may not modify comment ${commentId}`);
        this.name = "NotCommentAuthorError";
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
