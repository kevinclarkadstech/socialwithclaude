import { createAppError, type AppError } from "../error-handling";
import { fail } from "./result";

type Metadata = AppError["metadata"];

/** Not signed in. */
export const unauthenticated = (metadata?: Metadata) =>
    fail(createAppError({ type: "authentication", message: "Sign in required", metadata }));

/** Signed in, but not allowed. */
export const unauthorized = (message: string, metadata?: Metadata) =>
    fail(createAppError({ type: "authorization", message, metadata }));

/** Doesn't exist, or the caller may not know it exists. */
export const notFound = (message: string, metadata?: Metadata) =>
    fail(createAppError({ type: "not-found", message, metadata }));

/** Clashes with an existing record. */
export const conflict = (message: string, metadata?: Metadata) =>
    fail(createAppError({ type: "conflict", message, metadata }));

/** Well-formed input that isn't allowed. */
export const invalid = (message: string, metadata?: Metadata) =>
    fail(createAppError({ type: "validation", message, metadata }));
