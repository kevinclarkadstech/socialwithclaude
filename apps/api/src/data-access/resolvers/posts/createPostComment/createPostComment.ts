import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";

/** Comments on a post with the client's `id`. Null if the post doesn't exist or was deleted. */
export async function createPostComment({ id, postId, userId, content }: {
    id: string;
    postId: string;
    userId: string;
    content: string;
}): Promise<PostComment | null> {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} + 1` })
            .where(and(eq(schema.posts.id, postId), isNull(schema.posts.deletedAt)))
            .returning({ id: schema.posts.id });
        if (!post) {
            return null;
        }

        const [row] = await tx
            .insert(schema.postComments)
            .values({ id, postId, content, createdBy: userId, updatedBy: userId })
            .returning();
        return toPostComment(row!);
    });
}
