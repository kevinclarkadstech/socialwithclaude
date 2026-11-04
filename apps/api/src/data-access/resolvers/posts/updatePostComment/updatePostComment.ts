import { and, eq, isNull } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";

/** Changes a comment's content, as `userId`. Null if it doesn't exist or was deleted. */
export async function updatePostComment({ id, userId, content }: {
    id: string;
    userId: string;
    content: string;
}): Promise<PostComment | null> {
    const [row] = await db
        .update(schema.postComments)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(
            eq(schema.postComments.id, id),
            isNull(schema.postComments.deletedAt),
        ))
        .returning();
    return row ? toPostComment(row) : null;
}
