import { and, eq, isNull } from "drizzle-orm";
import type { PostView, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostViewById } from "../getPostViewById/getPostViewById";
import { syncPostMedia } from "../syncPostMedia/syncPostMedia";

/**
 * Changes a post's content, as `userId`, and makes its photos exactly
 * `media`. Null if it doesn't exist or was deleted.
 */
export async function updatePost({ id, userId, content, media }: {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
}): Promise<PostView | null> {
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

        // Just written, so it exists.
        return (await getPostViewById({ id, viewerId: userId }, tx))!;
    });
}
