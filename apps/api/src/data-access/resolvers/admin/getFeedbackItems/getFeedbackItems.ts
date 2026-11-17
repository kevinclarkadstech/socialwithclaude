import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { FeedbackItem, UserFeedbackStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toUserFeedback } from "../../../mappers/users/toUserFeedback/toUserFeedback";
import { toPage } from "../../../utils/toPage/toPage";

/** Feedback, newest first, with who sent it; only with `status` if given. */
export async function getFeedbackItems({ status, cursor, limit }: {
    status: UserFeedbackStatus | null;
    cursor: string | null;
    limit: number;
}): Promise<Page<FeedbackItem>> {
    const t = schema.userFeedback;
    const rows = await db
        .select({ feedback: t, user: creatorFields })
        .from(t)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, t.userId))
        .where(and(
            status ? eq(t.status, status) : undefined,
            cursor ? sql`(${t.createdAt}, ${t.id}) < (select created_at, id from user_feedback where id = ${cursor})` : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(limit + 1);
    const items = rows.map((row) => ({ ...toUserFeedback(row.feedback), user: row.user ? toCreator(row.user) : null }));
    return toPage(items, limit, (item) => item.id);
}
