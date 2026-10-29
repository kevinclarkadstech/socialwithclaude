import { initTRPC } from "@trpc/server";

import type { TRPCContext } from "./context";
import z, { ZodError } from "zod";
import { ResultSchema } from "@myapp/shared/types/result";
import { appErrorToTrpcError, AppTrpcError } from "../../error-handling";

const t = initTRPC.context<TRPCContext>().create({
    // errorFormatter: (opts) => {
    //     console.log('errorFormatter')
    //     const { shape, error } = opts;

    //     return {
    //         ...shape,
    //         data: {
    //             ...shape.data,
    //             // If it's a Zod validation error, flatten the error messages
    //             zodError:
    //                 error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
    //                     ? error.cause.flatten()
    //                     : null,
    //         },
    //     };
    // }
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
            let validatedResult = ResultSchema.parse(result.data);
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
        // TODO remove after testing
        console.log(error)
        if (error instanceof AppTrpcError) {
            return {
                ...result,
                ok: false,
                error,
            }
        }
        // truly unexpected error, how best approach?
        return {
            ...result,
            ok: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "There was an unexpected error",
                name: "unexpected-error"
            }
        }
    }
});

export const router = t.router;
export const procedure = t.procedure.use(mapAppError);
