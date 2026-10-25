import type { AppLogger } from "../observability";
import type { Result } from "./result";

export type MutationSchema<I = unknown, O = unknown> = { input: I; output: O };

export type MutationContext = {
    /** The signed-in user, or null when signed out. */
    user: { id: string } | null;
    logger: AppLogger;
};

export type Mutation<M extends MutationSchema, D extends object = {}> = (args: {
    input: M['input'],
    context: MutationContext,
    dependencies: D,
}) => Promise<Result<M['output']>>;