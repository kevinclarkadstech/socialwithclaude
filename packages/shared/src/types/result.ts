import z from "zod";
import { AppErrorSchema, type AppError } from "../error-handling";

// This is just to validate tRPC returns correct format
export const ResultSchema = z.discriminatedUnion("ok", [
    // Success Case
    z.object({
        ok: z.literal(true),
        value: z.unknown(),
    }),
    // Failure Case
    z.object({
        ok: z.literal(false),
        error: AppErrorSchema, // Validates the exact AppError union structure
    }),
]);

// this is used in function signatures
export type Result<SuccessValue> = {
    ok: true,
    value: SuccessValue | undefined,
} | {
    ok: false,
    error: AppError
};
