import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostCommentVote, PostCommentVoteValue } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostCommentVote } from "../../../mappers/posts/toPostCommentVote/toPostCommentVote";

/**
 * Sets `userId`'s vote on a comment (up or down), replacing any earlier vote,
 * and updates the comment's vote counts. Null if the comment doesn't exist or was deleted.
 */
export async function setPostCommentVote({ userId, postCommentId, value }: {
    userId: string;
    postCommentId: string;
    value: PostCommentVoteValue;
}): Promise<PostCommentVote | null> {
    return db.transaction(async (tx) => {
        const [comment] = await tx
            .select({ id: schema.postComments.id })
            .from(schema.postComments)
            .where(and(eq(schema.postComments.id, postCommentId), isNull(schema.postComments.deletedAt)))
            .for("update");
        if (!comment) {
            return null;
        }

        const [previous] = await tx
            .select({ value: schema.postCommentVotes.value })
            .from(schema.postCommentVotes)
            .where(and(eq(schema.postCommentVotes.userId, userId), eq(schema.postCommentVotes.postCommentId, postCommentId)));

        const [row] = await tx
            .insert(schema.postCommentVotes)
            .values({ userId, postCommentId, value })
            .onConflictDoUpdate({
                target: [schema.postCommentVotes.userId, schema.postCommentVotes.postCommentId],
                set: { value, updatedAt: new Date() },
            })
            .returning();

        if (previous?.value !== value) {
            const up = (value === 1 ? 1 : 0) - (previous?.value === 1 ? 1 : 0);
            const down = (value === -1 ? 1 : 0) - (previous?.value === -1 ? 1 : 0);
            await tx
                .update(schema.postComments)
                .set({
                    numUpVotes: sql`${schema.postComments.numUpVotes} + ${up}`,
                    numDownVotes: sql`${schema.postComments.numDownVotes} + ${down}`,
                })
                .where(eq(schema.postComments.id, postCommentId));
        }
        return toPostCommentVote(row!);
    });
}
