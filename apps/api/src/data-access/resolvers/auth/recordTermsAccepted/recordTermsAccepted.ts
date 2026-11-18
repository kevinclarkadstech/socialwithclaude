import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Records that someone agreed to `version` of the terms, now. */
export async function recordTermsAccepted({ userId, version }: { userId: string; version: string }): Promise<void> {
    await db
        .update(schema.users)
        .set({ termsAcceptedVersion: version, termsAcceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
}
