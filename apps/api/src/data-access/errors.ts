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
