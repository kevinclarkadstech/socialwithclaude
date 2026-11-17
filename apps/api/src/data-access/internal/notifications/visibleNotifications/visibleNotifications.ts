import { and, eq, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { schema } from "../../../db";
import { isNotBanned } from "../../users/isNotBanned/isNotBanned";

/**
 * `userId`'s notifications that still make sense to show: only once their
 * delivery time has come (see notificationDeliverAt), none from
 * `excludedActorIds` (blocked either way) or a banned person, and none for
 * something since undone: a post or comment deleted, a follow ended, a
 * follow request withdrawn or denied, or a mention edited out. Within the
 * delay, an undo means it's never seen; after it, it quietly drops out.
 * The list and the number on the bell use the same rule.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function visibleNotifications({ userId, excludedActorIds }: { userId: string; excludedActorIds: string[] }): SQL {
    const n = schema.notifications;
    const postLive = sql`exists (select 1 from ${schema.posts} p where p.id = ${n.data}->>'postId' and p.deleted_at is null)`;
    const commentLive = sql`exists (select 1 from ${schema.postComments} c where c.id = ${n.data}->>'postCommentId' and c.deleted_at is null)`;
    const follows = (followerId: AnyPgColumn, followingId: AnyPgColumn, statuses: string) =>
        sql`exists (select 1 from ${schema.userFollows} f where f.follower_id = ${followerId} and f.following_id = ${followingId} and f.status in (${sql.raw(statuses)}))`;
    // "@username" for the recipient, as mentionedUsernames finds it (usernames are only letters, numbers and _).
    const mentionsRecipient = (text: SQL) =>
        sql`${text} ~* ('(^|[^a-z0-9_@.])@' || (select up.username from ${schema.userProfiles} up where up.user_id = ${n.userId}) || '([^a-z0-9_]|$)')`;
    const postMentions = mentionsRecipient(sql`(select p.content from ${schema.posts} p where p.id = ${n.data}->>'postId')`);
    const commentMentions = mentionsRecipient(sql`(select c.content from ${schema.postComments} c where c.id = ${n.data}->>'postCommentId')`);
    return and(
        eq(n.userId, userId),
        lte(n.deliverAt, sql`now()`),
        or(isNull(n.actorId), and(excludedActorIds.length ? notInArray(n.actorId, excludedActorIds) : undefined, isNotBanned(n.actorId))),
        sql`case ${n.type}
            when 'commented' then ${postLive} and ${commentLive}
            when 'mentioned' then ${postLive} and (
                (${n.data}->>'postCommentId' is null and ${postMentions})
                or (${n.data}->>'postCommentId' is not null and ${commentLive} and ${commentMentions})
            )
            when 'followed' then ${follows(n.actorId, n.userId, "'accepted'")}
            when 'follow_requested' then ${follows(n.actorId, n.userId, "'pending', 'accepted'")}
            when 'follow_accepted' then ${follows(n.userId, n.actorId, "'accepted'")}
            else true
        end`,
    )!;
}
