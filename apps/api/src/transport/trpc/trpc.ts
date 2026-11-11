import { initTRPC, TRPCError } from "@trpc/server";

import type { TRPCContext } from "./context";
import z, { ZodError } from "zod";
import { ResultSchema } from "@myapp/shared/types/result";
import { appErrorToTrpcError, AppTrpcError } from "../../error-handling";

const t = initTRPC.context<TRPCContext>().create({
    /**
     * Unexpected errors (a thrown exception, a failed query) can carry SQL,
     * query params or other users' data in their message and stack. The
     * client gets a generic message instead; onError logs the original.
     */
    errorFormatter: ({ shape, error }) => {
        if (error.code !== "INTERNAL_SERVER_ERROR") {
            return shape;
        }
        return {
            ...shape,
            message: "Something went wrong",
            data: { ...shape.data, stack: undefined },
        };
    },
});

const mapAppError = t.middleware(async ({ next }) => {
    const result = await next();
    try {
        if (!result.ok) {
            const cause = result.error.cause;
            if (cause instanceof ZodError) {
                // Input that failed its schema: a validation error, with the details by field.
                throw new AppTrpcError({
                    code: "BAD_REQUEST",
                    message: "Invalid input",
                }, z.treeifyError(cause));
            }

            // Anything else: a deliberate TRPCError, or an unexpected throw (onError logs it; errorFormatter hides it from the client).
            return result;
        } else {
            // Every procedure returns a Result; one that doesn't throws here and is logged below as unexpected.
            const validatedResult = ResultSchema.parse(result.data);
            if (validatedResult.ok) {
                return {
                    ...result,
                    ok: true,
                    data: validatedResult,
                };
            }
            // A failed Result becomes the matching tRPC error (403, 404, …).
            return {
                ...result,
                ok: false,
                error: appErrorToTrpcError(validatedResult.error),
            }

        }
    } catch (error) {
        if (error instanceof AppTrpcError) {
            return {
                ...result,
                ok: false,
                error,
            }
        }
        // Truly unexpected, e.g. a procedure returned something that isn't a Result.
        // onError logs it (with this as the cause); errorFormatter hides it from the client.
        return {
            ...result,
            ok: false,
            error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unexpected error", cause: error }),
        }
    }
});

export const router = t.router;
export const procedure = t.procedure.use(mapAppError);
