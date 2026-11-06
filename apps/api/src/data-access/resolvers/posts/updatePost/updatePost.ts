import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";

/** Changes a post's content, as `userId`. Null if it doesn't exist or was deleted. */
export async function updatePost({ id, userId, content }: { id: string; userId: string; content: string }): Promise<Post | null> {
    const [updated] = await db
        .update(schema.posts)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
        .returning({ id: schema.posts.id });
    if (!updated) {
        return null;
    }

    const [row] = await selectPosts(db, userId).where(eq(schema.posts.id, id));
    return toPost(row!);
}
