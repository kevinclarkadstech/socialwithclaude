import { createHmac } from "node:crypto";
import { serverConfig } from "../../../../infra/config";

/**
 * How a banned person's email is kept after their account is deleted: an
 * HMAC of the trimmed, lowercased address, keyed with BETTER_AUTH_SECRET,
 * so the address itself isn't stored and can't be guessed from a leaked
 * table without the secret. Changing the secret forgets these.
 */
export function bannedEmailHash(email: string): string {
    return createHmac("sha256", serverConfig.BETTER_AUTH_SECRET).update(`banned-email:${email.trim().toLowerCase()}`).digest("hex");
}
