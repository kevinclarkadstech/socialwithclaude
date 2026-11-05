import { eq, sql } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";

/** Comments on a post with the client's `id`. Null if the id is already used. */
export async function createPostComment({ id, postId, userId, content }: {
    id: string;
    postId: string;
    userId: string;
    content: string;
}): Promise<PostComment | null> {
    return db.transaction(async (tx) => {
        const [row] = await tx
            .insert(schema.postComments)
            .values({ id, postId, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.postComments.id })
            .returning();
        if (!row) {
            return null;
        }

        await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} + 1` })
            .where(eq(schema.posts.id, postId));
        return toPostComment(row);
    });
}
