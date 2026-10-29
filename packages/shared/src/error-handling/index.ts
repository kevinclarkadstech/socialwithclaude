import z from "zod";

export const AppErrorSchema = z.object({
    message: z.string().optional(),
    type: z.union([z.literal('authorization'), z.literal('authentication'), z.literal('validation')]),
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

