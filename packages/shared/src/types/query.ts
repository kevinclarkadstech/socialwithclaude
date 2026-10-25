import type { AppLogger } from "../observability";
import type { Result } from "./result";

export type QuerySchema<I = unknown, O = unknown> = { input: I; output: O };

export type QueryContext = {
    /** The signed-in user, or null when signed out. */
    user: { id: string } | null;
    logger: AppLogger;
};

export type Query<Q extends QuerySchema, D extends object = {}> = (args: {
    input: Q['input'],
    context: QueryContext,
    dependencies: D,
}) => Promise<Result<Q['output']>>;