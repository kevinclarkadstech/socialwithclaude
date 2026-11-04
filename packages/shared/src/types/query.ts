import type { AppLogger } from "../observability";
import type { Result } from "./result";

export type QuerySchema<I = unknown, O = unknown> = { input: I; output: O };

export type QueryContext = {
    logger: AppLogger;
};

export type Query<Q extends QuerySchema, D extends object = {}> = (args: {
    input: Q['input'],
    context: QueryContext,
    dependencies: D,
}) => Promise<Result<Q['output']>>;