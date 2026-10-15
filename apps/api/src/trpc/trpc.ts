import { initTRPC, TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";

import {
    CommentNotFoundError,
    NotCommentAuthorError,
    NotPostAuthorError,
    PostNotFoundError,
    ProfileAlreadyExistsError,
    UsernameTakenError,
} from "../data-access";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create();

/**
 * Domain errors thrown by resolvers, mapped to the tRPC error the client sees.
 * `message` is a stable code the UI can match on.
 */
const domainErrors: [new (...args: never[]) => Error, TRPC_ERROR_CODE_KEY, string][] = [
    [UsernameTakenError, "CONFLICT", "USERNAME_TAKEN"],
    [ProfileAlreadyExistsError, "CONFLICT", "PROFILE_ALREADY_EXISTS"],
    [PostNotFoundError, "NOT_FOUND", "POST_NOT_FOUND"],
    [NotPostAuthorError, "FORBIDDEN", "NOT_POST_AUTHOR"],
    [CommentNotFoundError, "NOT_FOUND", "COMMENT_NOT_FOUND"],
    [NotCommentAuthorError, "FORBIDDEN", "NOT_COMMENT_AUTHOR"],
];

const mapDomainErrors = t.middleware(async ({ next }) => {
    const result = await next();
    if (!result.ok) {
        const cause = result.error.cause;
        for (const [ErrorClass, code, message] of domainErrors) {
            if (cause instanceof ErrorClass) throw new TRPCError({ code, message, cause });
        }
    }
    return result;
});

export const router = t.router;
export const procedure = t.procedure.use(mapDomainErrors);
