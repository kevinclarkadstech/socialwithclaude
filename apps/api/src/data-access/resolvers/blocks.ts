import { desc, eq, and, sql } from "drizzle-orm";

import { schema, type Database } from "../db";
import { removeFollow } from "./index";
import { authorFields } from "./shared";

/**
 * Both directions of a user's blocks: who they block, and who blocks them.
 * One indexed query (each side of the UNION has its own index).
 */
export async function getBlockListRows(db: Database, userId: string) {
    const rows = await db.execute<{ user_id: string; direction: "blocking" | "blocked_by" }>(sql`
        select ${schema.userBlocks.blockedUserId} as user_id, 'blocking' as direction
        from ${schema.userBlocks} where ${schema.userBlocks.userId} = ${userId}
        union all
        select ${schema.userBlocks.userId} as user_id, 'blocked_by' as direction
        from ${schema.userBlocks} where ${schema.userBlocks.blockedUserId} = ${userId}
    `);

    const blocking: string[] = [];
    const blockedBy: string[] = [];
    for (const row of rows.rows) {
        (row.direction === "blocking" ? blocking : blockedBy).push(row.user_id);
    }
    return { blocking, blockedBy };
}

/**
 * Blocks a user and removes any follows between the two (both directions),
 * in one transaction. Blocking an already-blocked user is a no-op.
 */
export async function blockUser(db: Database, userId: string, blockedUserId: string) {
    await db.transaction(async (tx) => {
        await tx.insert(schema.userBlocks).values({ userId, blockedUserId }).onConflictDoNothing();
        await removeFollow(tx, userId, blockedUserId);
        await removeFollow(tx, blockedUserId, userId);
    });
}

/** A no-op if the user wasn't blocked. */
export async function unblockUser(db: Database, userId: string, blockedUserId: string) {
    await db
        .delete(schema.userBlocks)
        .where(and(eq(schema.userBlocks.userId, userId), eq(schema.userBlocks.blockedUserId, blockedUserId)));
}

/** Users this user has blocked, most recent first, for a "Blocked users" screen. */
export async function getBlockedUsers(db: Database, userId: string) {
    return db
        .select({ ...authorFields, blockedAt: schema.userBlocks.createdAt })
        .from(schema.userBlocks)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.userBlocks.blockedUserId))
        .where(eq(schema.userBlocks.userId, userId))
        .orderBy(desc(schema.userBlocks.createdAt));
}
