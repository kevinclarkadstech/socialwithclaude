import { createAppError } from "../error-handling";
import { fail } from "./result";

/** Not signed in. */
export const unauthenticated = () => fail(createAppError({ type: "authentication", message: "Sign in required" }));

/** Signed in, but not allowed. */
export const unauthorized = (message: string) => fail(createAppError({ type: "authorization", message }));

/** Doesn't exist, or the caller may not know it exists. */
export const notFound = (message: string) => fail(createAppError({ type: "not-found", message }));

/** Clashes with an existing record. */
export const conflict = (message: string) => fail(createAppError({ type: "conflict", message }));

/** Well-formed input that isn't allowed. */
export const invalid = (message: string) => fail(createAppError({ type: "validation", message }));
