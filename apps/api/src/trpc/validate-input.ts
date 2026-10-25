import type { z } from "zod";
import { ValidationError } from "@myapp/shared/types/app-error";
import { fail, succeed, type Result } from "@myapp/shared/types/result";

/**
 * The parts of a Standard Schema (https://standardschema.dev) that tRPC uses:
 * it infers the client's input type from `types.input` and the procedure's
 * `input` from `types.output`.
 */
type StandardSchema<Input, Output> = {
    readonly "~standard": {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (value: unknown) => { readonly value: Output };
        readonly types?: { readonly input: Input; readonly output: Output };
    };
};

/**
 * A tRPC input validator that never throws: the procedure's `input` is a
 * Result holding the parsed input (defaults applied), or a "validation"
 * error listing each problem and its path, for the procedure to return so
 * the UI gets it like any other error. Clients still see the schema's input
 * type.
 *
 *   getUserPosts: procedure.input(validateInput(getUserPostsInput)).query(({ ctx, input }) =>
 *       input.error ? input : getUserPostsQuery({ input: input.value, ... }))
 */
export function validateInput<S extends z.ZodType>(
    schema: S,
): StandardSchema<z.input<S>, Result<z.output<S>, ValidationError>> {
    return {
        "~standard": {
            version: 1,
            vendor: "validate-input",
            validate: (value) => {
                const parsed = schema.safeParse(value);
                if (parsed.success) return { value: succeed(parsed.data as z.output<S>) };
                return {
                    value: fail(
                        ValidationError(
                            parsed.error.issues.map((issue) => ({
                                message: issue.message,
                                path: issue.path.length > 0 ? issue.path.join(".") : undefined,
                            })),
                        ),
                    ),
                };
            },
        },
    };
}
