import type { AppError } from "./app-error";

export type Result<SuccessValue extends NonNullable<any>, FailureError extends AppError = AppError> = { value: SuccessValue, error: null } | { value: null, error: FailureError };

export function succeed<SuccessValue extends NonNullable<any>, FailureError extends AppError = AppError>(value?: SuccessValue): Result<SuccessValue, FailureError> {
    return { value: value ?? undefined as SuccessValue, error: null, };
}

export function fail<FailureError extends AppError = AppError>(error: FailureError, _reason?: string): Result<never, FailureError> {
    return { error, value: null, };
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