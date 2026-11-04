import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Soft deletes one of `userId`'s comments. False if they have no such comment. */
export async function deletePostComment({ id, userId }: { id: string; userId: string }): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [comment] = await tx
            .update(schema.postComments)
            .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
            .where(and(
                eq(schema.postComments.id, id),
                eq(schema.postComments.createdBy, userId),
                isNull(schema.postComments.deletedAt),
            ))
            .returning({ postId: schema.postComments.postId });
        if (!comment) return false;

        await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} - 1` })
            .where(eq(schema.posts.id, comment.postId));
        return true;
    });
}
