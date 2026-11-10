import { eq, sql } from "drizzle-orm";
import type { Post, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostById } from "../getPostById/getPostById";
import { syncPostMedia } from "../syncPostMedia/syncPostMedia";

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

        await syncPostMedia(tx, { postId: id, media });

        await tx
            .update(schema.userProfiles)
            .set({ numPosts: sql`${schema.userProfiles.numPosts} + 1` })
            .where(eq(schema.userProfiles.userId, userId));

        // Just written, so it exists.
        return (await getPostById({ id, viewerId: userId }, tx))!;
    });
}
