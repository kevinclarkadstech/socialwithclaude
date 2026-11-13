import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { UserBlock } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserBlock } from "../../../mappers/users";
import { toPage } from "../../../paging";

/** Users `userId` has blocked, most recent first. The cursor is the last blocked user's id. */
export async function getUserBlocks({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<UserBlock>> {
    const t = schema.userBlocks;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            eq(t.userId, userId),
            cursor
                ? sql`(${t.createdAt}, ${t.blockedUserId}) < (select created_at, blocked_user_id from user_blocks where user_id = ${userId} and blocked_user_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.blockedUserId))
        .limit(limit + 1);
    return toPage(rows.map(toUserBlock), limit, (block) => block.blockedUserId);
}
