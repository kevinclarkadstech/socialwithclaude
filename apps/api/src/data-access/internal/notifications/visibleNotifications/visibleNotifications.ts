import { and, eq, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { schema } from "../../../db";
import { isNotBanned } from "../../users/isNotBanned/isNotBanned";

/**
 * `userId`'s notifications that still make sense to show: none from
 * `excludedActorIds` (blocked either way) or a banned person, none about a
 * post or comment since deleted, and no follow request since withdrawn or
 * denied. The list and the number on the bell use the same rule.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function visibleNotifications({ userId, excludedActorIds }: { userId: string; excludedActorIds: string[] }): SQL {
    const n = schema.notifications;
    const postLive = sql`exists (select 1 from ${schema.posts} p where p.id = ${n.data}->>'postId' and p.deleted_at is null)`;
    const commentLive = sql`exists (select 1 from ${schema.postComments} c where c.id = ${n.data}->>'postCommentId' and c.deleted_at is null)`;
    // Still asked or since accepted; gone once withdrawn or denied.
    const requestStands = sql`exists (select 1 from ${schema.userFollows} f where f.follower_id = ${n.actorId} and f.following_id = ${n.userId} and f.status in ('pending', 'accepted'))`;
    return and(
        eq(n.userId, userId),
        or(isNull(n.actorId), and(excludedActorIds.length ? notInArray(n.actorId, excludedActorIds) : undefined, isNotBanned(n.actorId))),
        sql`case ${n.type}
            when 'commented' then ${postLive} and ${commentLive}
            when 'mentioned' then ${postLive} and (${n.data}->>'postCommentId' is null or ${commentLive})
            when 'follow_requested' then ${requestStands}
            else true
        end`,
    )!;
}
