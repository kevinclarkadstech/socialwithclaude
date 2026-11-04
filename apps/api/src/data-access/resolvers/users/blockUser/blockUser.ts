import { and, eq } from "drizzle-orm";
import type { UserBlock } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserBlock } from "../../../mappers/users";

/** `userId` blocks `blockedUserId`. Blocking again returns the existing block. */
export async function blockUser({ userId, blockedUserId }: { userId: string; blockedUserId: string }): Promise<UserBlock> {
    const [created] = await db
        .insert(schema.userBlocks)
        .values({ userId, blockedUserId })
        .onConflictDoNothing()
        .returning();
    if (created) return toUserBlock(created);

    const [existing] = await db
        .select()
        .from(schema.userBlocks)
        .where(and(eq(schema.userBlocks.userId, userId), eq(schema.userBlocks.blockedUserId, blockedUserId)));
    return toUserBlock(existing!);
}
