import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

/** Creates a post with the client's `id`. Null if the id is already used. */
export async function createPost({ id, userId, content }: { id: string; userId: string; content: string }): Promise<Post | null> {
    const [row] = await db
        .insert(schema.posts)
        .values({ id, content, createdBy: userId, updatedBy: userId })
        .onConflictDoNothing({ target: schema.posts.id })
        .returning();
    return row ? toPost(row, null) : null;
}
