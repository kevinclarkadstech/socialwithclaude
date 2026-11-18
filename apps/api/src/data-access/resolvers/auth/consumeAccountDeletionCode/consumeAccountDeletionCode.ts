import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";
import { accountDeletionCodeIdentifier } from "../../../constants";

/** Wrong tries a code allows before it stops working. */
const allowedAttempts = 3;

/**
 * Whether `codeHash` matches someone's current, unexpired account deletion
 * code. A match uses the code up; a miss counts as an attempt, and the last
 * allowed miss deletes it too.
 */
export async function consumeAccountDeletionCode({ userId, codeHash }: { userId: string; codeHash: string }): Promise<boolean> {
    const identifier = accountDeletionCodeIdentifier(userId);
    return db.transaction(async (tx) => {
        const [row] = await tx
            .select()
            .from(schema.verifications)
            .where(eq(schema.verifications.identifier, identifier))
            .for("update");
        if (!row) {
            return false;
        }
        const [savedHash, attemptsText] = row.value.split(":");
        const attempts = Number(attemptsText);
        const isExpired = row.expiresAt.getTime() <= Date.now();
        const isMatch = !isExpired && savedHash === codeHash;
        if (isMatch || isExpired || attempts + 1 >= allowedAttempts) {
            await tx.delete(schema.verifications).where(eq(schema.verifications.id, row.id));
        } else {
            await tx
                .update(schema.verifications)
                .set({ value: `${savedHash}:${attempts + 1}`, updatedAt: new Date() })
                .where(eq(schema.verifications.id, row.id));
        }
        return isMatch;
    });
}
