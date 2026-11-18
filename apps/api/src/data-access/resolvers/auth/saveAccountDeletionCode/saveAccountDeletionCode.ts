import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";
import { accountDeletionCodeIdentifier } from "../../../constants";

/**
 * Saves the hash of someone's new account deletion code, replacing any
 * earlier one, in better-auth's verifications table (as `hash:attempts`).
 */
export async function saveAccountDeletionCode({ userId, codeHash, expiresAt }: { userId: string; codeHash: string; expiresAt: Date }): Promise<void> {
    const identifier = accountDeletionCodeIdentifier(userId);
    await db.transaction(async (tx) => {
        await tx.delete(schema.verifications).where(eq(schema.verifications.identifier, identifier));
        await tx.insert(schema.verifications).values({ identifier, value: `${codeHash}:0`, expiresAt });
    });
}
