import { eq, or } from "drizzle-orm";
import type { UserBlockList } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Who `userId` has blocked, and who has blocked them. */
export async function getUserBlockList({ userId }: { userId: string }): Promise<UserBlockList> {
    const rows = await db
        .select()
        .from(schema.userBlocks)
        .where(or(eq(schema.userBlocks.userId, userId), eq(schema.userBlocks.blockedUserId, userId)));
    return {
        blocking: rows.filter((row) => row.userId === userId).map((row) => row.blockedUserId),
        blockedBy: rows.filter((row) => row.blockedUserId === userId).map((row) => row.userId),
    };
}
