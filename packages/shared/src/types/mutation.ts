import { AppLogger } from "../observability";
import { Result } from "./result";

export type MutationSchema<I = unknown, O = unknown> = { input: I; output: O };

export type MutationContext = {
    user: {} | null;
    logger: AppLogger;
};

export type Mutation<M extends MutationSchema, D extends object = {}> = (args: {
    input: M['input'],
    context: MutationContext,
    dependencies: D,
}) => Promise<Result<M['output']>>;