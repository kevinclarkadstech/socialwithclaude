import { createAppError } from "@myapp/shared/error-handling";
import { fail } from "@myapp/shared/utils";

/** A failed Result for something that doesn't exist (or isn't the caller's). */
export const notFound = (message: string) => fail(createAppError({ type: "not-found", message }));

/** A failed Result for a create that clashes with an existing record. */
export const conflict = (message: string) => fail(createAppError({ type: "conflict", message }));

/** A failed Result for input that's well-formed but not allowed. */
export const invalid = (message: string) => fail(createAppError({ type: "validation", message }));
