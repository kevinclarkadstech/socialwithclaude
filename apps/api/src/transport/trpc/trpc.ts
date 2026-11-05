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
                // map here to AppError 
                throw new AppTrpcError({
                    code: "BAD_REQUEST",
                    message: "Invalid input",
                }, z.treeifyError(cause));
            }

            // Return actual error result because I don't know why this threw 
            return result;
        } else {
            // TODO in the rare case a query or mutation is returned without a Result<Value> wrapper, probably need to make sure this is logged
            const validatedResult = ResultSchema.parse(result.data);
            // returns Result<Value> without error and it's value
            if (validatedResult.ok) {
                return {
                    ...result,
                    ok: true,
                    data: validatedResult,
                };
            }
            const appTrpcError = appErrorToTrpcError(validatedResult.error);

            // could also just throw appTrpcError
            return {
                ...result,
                ok: false,
                error: appTrpcError,
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
