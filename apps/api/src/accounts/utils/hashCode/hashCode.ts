import { createHash } from "node:crypto";

/** How a one-time code is stored: only its hash, so a database leak doesn't leak live codes. */
export function hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
}
