import { eq, sql } from "drizzle-orm";
import type { Post, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";
import { placePostMedia } from "../../../post-media";

/**
 * Creates a post with the client's `id` and puts the photos on it, and counts
 * it on the author's profile. Null if the id is already used.
 */
export async function createPost({ id, userId, content, media }: {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
}): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.posts)
            .values({ id, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning({ id: schema.posts.id });
        if (!created) {
            return null;
        }

        await placePostMedia(tx, { postId: id, media, removedMediaIds: [] });

        await tx
            .update(schema.userProfiles)
            .set({ numPosts: sql`${schema.userProfiles.numPosts} + 1` })
            .where(eq(schema.userProfiles.userId, userId));

        const [row] = await selectPosts(tx, userId).where(eq(schema.posts.id, id));
        return toPost(row!);
    });
}
