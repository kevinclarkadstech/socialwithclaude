import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { UserBlockView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toUserBlock } from "../../../mappers/users/toUserBlock/toUserBlock";
import { toPage } from "../../../utils/toPage/toPage";

/** Users `userId` has blocked, most recent first, each with their profile. The cursor is the last blocked user's id. */
export async function getUserBlockViews({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<UserBlockView>> {
    const t = schema.userBlocks;
    const rows = await db
        .select({ block: t, blockedUser: creatorFields })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, t.blockedUserId))
        .where(and(
            eq(t.userId, userId),
            cursor
                ? sql`(${t.createdAt}, ${t.blockedUserId}) < (select created_at, blocked_user_id from user_blocks where user_id = ${userId} and blocked_user_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.blockedUserId))
        .limit(limit + 1);
    const views = rows.map(({ block, blockedUser }) => ({ ...toUserBlock(block), blockedUser: toCreator(blockedUser) }));
    return toPage(views, limit, (view) => view.blockedUserId);
}
