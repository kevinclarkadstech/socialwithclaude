import { and, eq, isNull } from "drizzle-orm";
import type { Post, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";
import { syncPostMedia } from "../../../post-media";

/**
 * Changes a post's content, as `userId`, and makes its photos exactly
 * `media`. Null if it doesn't exist or was deleted.
 */
export async function updatePost({ id, userId, content, media }: {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
}): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const [updated] = await tx
            .update(schema.posts)
            .set({ content, updatedBy: userId, updatedAt: new Date() })
            .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
            .returning({ id: schema.posts.id });
        if (!updated) {
            return null;
        }

        await syncPostMedia(tx, { postId: id, media });

        const [row] = await selectPosts(tx, userId).where(eq(schema.posts.id, id));
        return toPost(row!);
    });
}
