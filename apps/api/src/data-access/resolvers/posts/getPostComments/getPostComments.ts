import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";
import { toPage } from "../../../paging";

/** A post's comments, oldest or newest first. */
export async function getPostComments({ postId, order, cursor, limit }: {
    postId: string;
    order: "oldest" | "newest";
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostComment>> {
    const t = schema.postComments;
    const cursorRow = sql`(select created_at, id from post_comments where id = ${cursor})`;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            eq(t.postId, postId),
            isNull(t.deletedAt),
            cursor
                ? order === "oldest"
                    ? sql`(${t.createdAt}, ${t.id}) > ${cursorRow}`
                    : sql`(${t.createdAt}, ${t.id}) < ${cursorRow}`
                : undefined,
        ))
        .orderBy(...(order === "oldest" ? [asc(t.createdAt), asc(t.id)] : [desc(t.createdAt), desc(t.id)]))
        .limit(limit + 1);
    return toPage(rows.map(toPostComment), limit, (comment) => comment.id);
}
