import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

/** Changes the content of one of `userId`'s posts. Null if they have no such post. */
export async function updatePost({ id, userId, content }: { id: string; userId: string; content: string }): Promise<Post | null> {
    const [row] = await db
        .update(schema.posts)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.posts.id, id), eq(schema.posts.createdBy, userId), isNull(schema.posts.deletedAt)))
        .returning();
    if (!row) return null;

    const [listing] = await db.select().from(schema.postListings).where(eq(schema.postListings.postId, id));
    return toPost(row, listing ?? null);
}
