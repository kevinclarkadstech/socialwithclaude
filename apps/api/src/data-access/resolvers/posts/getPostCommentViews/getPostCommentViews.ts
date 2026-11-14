import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { PostCommentView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../utils/toPage/toPage";
import { findPostCommentViews } from "../../../internal/posts/findPostCommentViews/findPostCommentViews";

/** A post's comments, oldest or newest first, as `viewerId` sees them. */
export async function getPostCommentViews({ postId, viewerId, order, cursor, limit }: {
    postId: string;
    viewerId: string | null;
    order: "oldest" | "newest";
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostCommentView>> {
    const t = schema.postComments;
    const cursorRow = sql`(select created_at, id from post_comments where id = ${cursor})`;
    const comments = await findPostCommentViews({
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
