import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { PostComment } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../paging";
import { readPostComments } from "../readPostComments/readPostComments";

/** A post's comments, oldest or newest first, as `viewerId` sees them. */
export async function getPostComments({ postId, viewerId, order, cursor, limit }: {
    postId: string;
    viewerId: string | null;
    order: "oldest" | "newest";
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostComment>> {
    const t = schema.postComments;
    const cursorRow = sql`(select created_at, id from post_comments where id = ${cursor})`;
    const comments = await readPostComments({
        viewerId,
        where: and(
            eq(t.postId, postId),
            isNull(t.deletedAt),
            cursor
                ? order === "oldest"
                    ? sql`(${t.createdAt}, ${t.id}) > ${cursorRow}`
                    : sql`(${t.createdAt}, ${t.id}) < ${cursorRow}`
                : undefined,
        ),
        orderBy: order === "oldest" ? [asc(t.createdAt), asc(t.id)] : [desc(t.createdAt), desc(t.id)],
        limit: limit + 1,
    });
    return toPage(comments, limit, (comment) => comment.id);
}
