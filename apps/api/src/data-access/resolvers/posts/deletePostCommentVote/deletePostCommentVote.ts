import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Removes `userId`'s vote on a comment and updates its vote counts. False if they hadn't voted. */
export async function deletePostCommentVote({ userId, postCommentId }: {
    userId: string;
    postCommentId: string;
}): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [vote] = await tx
            .delete(schema.postCommentVotes)
            .where(and(eq(schema.postCommentVotes.userId, userId), eq(schema.postCommentVotes.postCommentId, postCommentId)))
            .returning({ value: schema.postCommentVotes.value });
        if (!vote) {
            return false;
        }

        await tx
            .update(schema.postComments)
            .set(vote.value === 1
                ? { numUpVotes: sql`${schema.postComments.numUpVotes} - 1` }
                : { numDownVotes: sql`${schema.postComments.numDownVotes} - 1` })
            .where(eq(schema.postComments.id, postCommentId));
        return true;
    });
}
