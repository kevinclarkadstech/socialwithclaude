import { eq, sql } from "drizzle-orm";
import { db, schema } from "../../../db";
import { accountDeletionCodeIdentifier } from "../../../constants";

/**
 * Deletes a user and everything they made, for good: deleting the users row
 * cascades to their profile, settings, posts (with every comment, save,
 * vote and report link on them), comments, votes, saves, follows, blocks,
 * chats (with both people's messages), feedback, notifications and sessions.
 * First, in the same transaction, it takes them out of the counts on other
 * people's things: follower and following counts, saves and comments on
 * others' posts, and votes on others' comments. Reports and the moderation
 * log keep their rows (see reportAuditFields). Whether there was such a user.
 */
export async function deleteAccount({ userId }: { userId: string }): Promise<boolean> {
    return db.transaction(async (tx) => {
        // Their accepted follows: the people they followed lose a follower, and their followers one they follow.
        await tx.execute(sql`
            update ${schema.userProfiles} p set num_followers = greatest(p.num_followers - 1, 0)
            from ${schema.userFollows} f
            where f.follower_id = ${userId} and f.status = 'accepted' and p.user_id = f.following_id`);
        await tx.execute(sql`
            update ${schema.userProfiles} p set num_following = greatest(p.num_following - 1, 0)
            from ${schema.userFollows} f
            where f.following_id = ${userId} and f.status = 'accepted' and p.user_id = f.follower_id`);
        // Their saves of other people's posts.
        await tx.execute(sql`
            update ${schema.posts} p set num_saves = greatest(p.num_saves - s.saves, 0)
            from (select post_id, count(*)::int as saves from ${schema.userSaves} where user_id = ${userId} and post_id is not null group by post_id) s
            where p.id = s.post_id and p.created_by <> ${userId}`);
        // Their comments on other people's posts (deleted comments were already taken off).
        await tx.execute(sql`
            update ${schema.posts} p set num_comments = greatest(p.num_comments - c.comments, 0)
            from (select post_id, count(*)::int as comments from ${schema.postComments} where created_by = ${userId} and deleted_at is null group by post_id) c
            where p.id = c.post_id and p.created_by <> ${userId}`);
        // Their votes on other people's comments.
        await tx.execute(sql`
            update ${schema.postComments} c set
                num_up_votes = greatest(c.num_up_votes - (v.value = 1)::int, 0),
                num_down_votes = greatest(c.num_down_votes - (v.value = -1)::int, 0)
            from ${schema.postCommentVotes} v
            where v.user_id = ${userId} and c.id = v.post_comment_id and c.created_by <> ${userId}`);
        // Not linked to the user by a foreign key.
        await tx.delete(schema.verifications).where(eq(schema.verifications.identifier, accountDeletionCodeIdentifier(userId)));
        const deleted = await tx.delete(schema.users).where(eq(schema.users.id, userId)).returning({ id: schema.users.id });
        return deleted.length > 0;
    });
}
