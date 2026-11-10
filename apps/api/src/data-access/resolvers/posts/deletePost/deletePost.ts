import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../../../db";
import { deletePostMedia } from "../deletePostMedia/deletePostMedia";

/**
 * Soft deletes a post, as `userId`, and takes it off its author's counts
 * (and their listings count, for a listing), and deletes its photos (the
 * mutation deletes their files). False if it doesn't exist or was already deleted.
 */
export async function deletePost({ id, userId }: { id: string; userId: string }): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [deleted] = await tx
            .update(schema.posts)
            .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
            .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
            .returning({ createdBy: schema.posts.createdBy, type: schema.posts.type });
        if (!deleted) {
            return false;
        }

        await deletePostMedia(tx, { postId: id });

        await tx
            .update(schema.userProfiles)
            .set({
                numPosts: sql`greatest(${schema.userProfiles.numPosts} - 1, 0)`,
                ...(deleted.type === "listing" && { numListings: sql`greatest(${schema.userProfiles.numListings} - 1, 0)` }),
            })
            .where(eq(schema.userProfiles.userId, deleted.createdBy));
        return true;
    });
}
