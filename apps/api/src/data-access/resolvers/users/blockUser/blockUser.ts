import { and, eq, or } from "drizzle-orm";
import type { UserBlock } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { adjustFollowCounts } from "../../../internal/users/adjustFollowCounts/adjustFollowCounts";
import { toUserBlock } from "../../../mappers/users/toUserBlock/toUserBlock";

/**
 * `userId` blocks `blockedUserId`, and any follow or follow request between
 * the two, either way, is deleted (accepted ones come off both follow counts),
 * all in one transaction. Blocking again returns the existing block (and makes
 * sure the follows are gone).
 */
export async function blockUser({ userId, blockedUserId }: { userId: string; blockedUserId: string }): Promise<UserBlock> {
    const b = schema.userBlocks;
    const f = schema.userFollows;
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(b)
            .values({ userId, blockedUserId })
            .onConflictDoNothing()
            .returning();
        const block = created ?? (await tx.select().from(b).where(and(eq(b.userId, userId), eq(b.blockedUserId, blockedUserId))))[0]!;

        const endedFollows = await tx
            .delete(f)
            .where(or(
                and(eq(f.followerId, userId), eq(f.followingId, blockedUserId)),
                and(eq(f.followerId, blockedUserId), eq(f.followingId, userId)),
            ))
            .returning({ followerId: f.followerId, followingId: f.followingId, status: f.status });
        for (const follow of endedFollows) {
            if (follow.status === "accepted") {
                await adjustFollowCounts(tx, follow.followerId, follow.followingId, -1);
            }
        }

        return toUserBlock(block);
    });
}
