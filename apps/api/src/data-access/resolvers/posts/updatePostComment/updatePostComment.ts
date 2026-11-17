import { and, eq, isNull } from "drizzle-orm";
import type { PostCommentPhoto, PostCommentView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostCommentViewById } from "../getPostCommentViewById/getPostCommentViewById";

/**
 * Changes a comment's content, as `userId`, and its photo: undefined keeps
 * it, null removes it, a photo replaces it. Null if it doesn't exist or was deleted.
 */
export async function updatePostComment({ id, userId, content, photo }: {
    id: string;
    userId: string;
    content: string;
    photo?: Pick<PostCommentPhoto, "id" | "width" | "height" | "placeholder"> | null;
}): Promise<PostCommentView | null> {
    return db.transaction(async (tx) => {
        const [updated] = await tx
            .update(schema.postComments)
            .set({ content, updatedBy: userId, updatedAt: new Date() })
            .where(and(eq(schema.postComments.id, id), isNull(schema.postComments.deletedAt)))
            .returning({ id: schema.postComments.id });
        if (!updated) {
            return null;
        }
        if (photo !== undefined) {
            await tx.delete(schema.postCommentPhotos).where(eq(schema.postCommentPhotos.postCommentId, id));
            if (photo) {
                await tx.insert(schema.postCommentPhotos).values({ ...photo, postCommentId: id, createdBy: userId, updatedBy: userId });
            }
        }

        // Just written, so it exists.
        return (await getPostCommentViewById({ id, viewerId: userId }, tx))!;
    });
}
