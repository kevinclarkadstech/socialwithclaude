import { and, eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** False if `userId` hadn't blocked `blockedUserId`. */
export async function unblockUser({ userId, blockedUserId }: { userId: string; blockedUserId: string }): Promise<boolean> {
    const rows = await db
        .delete(schema.userBlocks)
        .where(and(eq(schema.userBlocks.userId, userId), eq(schema.userBlocks.blockedUserId, blockedUserId)))
        .returning({ userId: schema.userBlocks.userId });
    return rows.length > 0;
}
