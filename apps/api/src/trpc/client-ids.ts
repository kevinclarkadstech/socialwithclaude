import { z } from "zod";

import { IdConflictError } from "../data-access";

/**
 * A client-generated ULID (26 chars, Crockford base32). Lowercase is accepted
 * and normalized, since ULIDs are case-insensitive. Its embedded time is not
 * trusted: lists sort by the server's created_at.
 */
export const clientId = z.ulid().transform((id) => id.toUpperCase());

/**
 * Runs a create with an optional client id so retries are safe (offline sync
 * queues resend creates). If this user already created the record, the call
 * succeeds without creating again; `isOwnExisting` throws IdConflictError if
 * the id belongs to someone else.
 *
 * Checked before creating (so a retry doesn't redo side effects like moving
 * photos) and again if the create hits the id, for concurrent retries.
 */
export async function createOnce(
    id: string | undefined,
    isOwnExisting: () => Promise<boolean>,
    create: () => Promise<void>,
): Promise<void> {
    if (id && (await isOwnExisting())) return;
    try {
        await create();
    } catch (err) {
        if (id && err instanceof IdConflictError && (await isOwnExisting())) return;
        throw err;
    }
}
