import z from "zod";

export const AppErrorSchema = z.object({
    message: z.string().optional(),
    type: z.union([z.literal('authorization'), z.literal('authentication'), z.literal('validation'), z.literal('not-found'), z.literal('conflict'), z.literal('unexpected')]),
    metadata: z.record(z.string(), z.any()).optional(),
    severity: z.union([z.literal('info'), z.literal('warn'), z.literal('error')]).default('info')
});

export type AppError = z.infer<typeof AppErrorSchema>;

export function createAppError(input: Pick<AppError, 'type'> & Partial<AppError>): AppError {
    return {
        ...input,
        message: input.message,
        metadata: input.metadata,
        severity: input.severity ?? 'info',
    }
}


type Metadata = AppError["metadata"];

/** Not signed in. */
export function authenticationError(message = "Sign in required", metadata?: Metadata): AppError {
    return createAppError({ type: "authentication", message, metadata });
}

/** Signed in, but not allowed. */
export function authorizationError(message = "You're not allowed to do that", metadata?: Metadata): AppError {
    return createAppError({ type: "authorization", message, metadata });
}

/** Doesn't exist, or the caller may not know it exists. */
export function notFoundError(message = "Not found", metadata?: Metadata): AppError {
    return createAppError({ type: "not-found", message, metadata });
}

/** Clashes with an existing record. */
export function conflictError(message = "Already exists", metadata?: Metadata): AppError {
    return createAppError({ type: "conflict", message, metadata });
}

/** Well-formed input that isn't allowed. */
export function validationError(message = "Invalid request", metadata?: Metadata): AppError {
    return createAppError({ type: "validation", message, metadata });
}

/** Something went wrong that isn't a decision: the network, a server failure, a bug. */
export function unexpectedError(message = "Something went wrong", metadata?: Metadata): AppError {
    return createAppError({ type: "unexpected", message, metadata, severity: "error" });
}
