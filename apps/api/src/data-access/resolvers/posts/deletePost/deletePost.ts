import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Soft deletes a post, as `userId`. False if it doesn't exist or was already deleted. */
export async function deletePost({ id, userId }: { id: string; userId: string }): Promise<boolean> {
    const rows = await db
        .update(schema.posts)
        .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
        .returning({ id: schema.posts.id });
    return rows.length > 0;
}
