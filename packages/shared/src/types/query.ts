import { AppLogger } from "../observability";
import { Result } from "./result";

export type QuerySchema<I = unknown, O = unknown> = { input: I; output: O };

export type QueryContext = {
    user: {} | null;
    logger: AppLogger;
};

export type Query<Q extends QuerySchema, D extends object = {}> = (args: {
    input: Q['input'],
    context: QueryContext,
    dependencies: D,
}) => Promise<Result<Q['output']>>;