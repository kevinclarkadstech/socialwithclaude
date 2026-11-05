import { eq } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";

/** Creates a post with the client's `id`. Null if the id is already used. */
export async function createPost({ id, userId, content }: { id: string; userId: string; content: string }): Promise<Post | null> {
    const [created] = await db
        .insert(schema.posts)
        .values({ id, content, createdBy: userId, updatedBy: userId })
        .onConflictDoNothing({ target: schema.posts.id })
        .returning({ id: schema.posts.id });
    if (!created) {
        return null;
    }

    const [row] = await selectPosts(db, userId).where(eq(schema.posts.id, id));
    return toPost(row!);
}
