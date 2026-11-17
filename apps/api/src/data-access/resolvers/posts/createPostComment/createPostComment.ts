import { eq, sql } from "drizzle-orm";
import type { PostCommentPhoto, PostCommentView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostCommentViewById } from "../getPostCommentViewById/getPostCommentViewById";

/** Comments on a post with the client's `id`, with its photo if any. Null if the id is already used. */
export async function createPostComment({ id, postId, userId, content, photo }: {
    id: string;
    postId: string;
    userId: string;
    content: string;
    photo: Pick<PostCommentPhoto, "id" | "width" | "height" | "placeholder"> | null;
}): Promise<PostCommentView | null> {
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.postComments)
            .values({ id, postId, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.postComments.id })
            .returning({ id: schema.postComments.id });
        if (!created) {
            return null;
        }
        if (photo) {
            await tx.insert(schema.postCommentPhotos).values({ ...photo, postCommentId: id, createdBy: userId, updatedBy: userId });
        }

        await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} + 1` })
            .where(eq(schema.posts.id, postId));

        // Just written, so it exists.
        return (await getPostCommentViewById({ id, viewerId: userId }, tx))!;
    });
}
