import type { z } from "zod";

import { ValidationError } from "./app-error";
import { fail, succeed, type Result } from "./result";

/**
 * Parses `input` with `schema` (applying its defaults). On failure, a
 * "validation" error listing each problem and where it is.
 */
export function validate<S extends z.ZodType>(
    schema: S,
    input: unknown,
): Result<z.output<S>, ValidationError> {
    const parsed = schema.safeParse(input);
    if (parsed.success) return succeed(parsed.data as z.output<S>);
    return fail(
        ValidationError(
            parsed.error.issues.map((issue) => ({
                message: issue.message,
                path: issue.path.length > 0 ? issue.path.join(".") : undefined,
            })),
        ),
    );
}
