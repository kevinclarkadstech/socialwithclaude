import { eq, or } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Everyone `userId` has blocked or been blocked by (a block either way hides
 * each from the other).
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function findBlockedEitherWay(userId: string): Promise<string[]> {
    const b = schema.userBlocks;
    const rows = await db.select({ userId: b.userId, blockedUserId: b.blockedUserId }).from(b).where(or(eq(b.userId, userId), eq(b.blockedUserId, userId)));
    return [...new Set(rows.map((row) => (row.userId === userId ? row.blockedUserId : row.userId)))];
}
