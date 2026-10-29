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

export function succeed<SuccessValue = undefined>(value?: SuccessValue): Result<SuccessValue> {
    return { ok: true, value: value, };
}

export function fail(error: AppError, reason?: string): Result<never> {
    return { ok: false, error, };
}

// type Todo = {
//     done: boolean;
// }

// type MutationSchema<I = unknown, O = unknown> = { input: I; output: O };

// type MutationContext = {}

// type Db = {
//     insert: Function
// }

// type MutationHandler<M extends MutationSchema> =
//     (input: M['input'], context: MutationContext) => Promise<M['output']>;

// type Mutation<M extends MutationSchema, D extends Record<string, any> = {}> = (deps: D) => MutationHandler<M>;

// type CreateTodoMutationSchema = MutationSchema<{ text: string }, Todo>;

// type CreateTodo = Mutation<CreateTodoMutationSchema, { db: Db }>;

// export const createTodoMutation: CreateTodo = (deps) => {
//     return async (input, context) => {
//         return deps.db.insert(input);
//     };
// }