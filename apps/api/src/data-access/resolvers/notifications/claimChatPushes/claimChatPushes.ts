import { sql } from "drizzle-orm";
import { db, schema } from "../../../db";
import { isUnavailable } from "../../../internal/users/isUnavailable/isUnavailable";
import { findBlockedEitherWay } from "../../../internal/users/findBlockedEitherWay/findBlockedEitherWay";
import { countUnreadVisible } from "../../../internal/notifications/countUnreadVisible/countUnreadVisible";

/** A chat to push about to one of its members: who wrote last, how many messages they haven't read, and the latest. */
export interface ChatToPush {
    userId: string;
    chatId: string;
    senderUsername: string;
    unreadCount: number;
    latestMessage: string;
    // The number on their bell, for the badge.
    badge: number;
}

/**
 * Takes up to `limit` chat members who have new messages from others to be
 * told about, and marks them told (last_pushed_at), in one go: members
 * another instance is taking at the same moment are skipped. A member is
 * due once the first message they haven't read, and haven't been pushed
 * about, is `delaySeconds` old (so a burst makes one push, and a message
 * read in the meantime makes none), and only if they have message pushes
 * on. Returns what each push says: deleted messages, people who are
 * unavailable (see isAvailable) and anyone across a block aren't counted.
 * A member whose newest such message is more than `maxAgeSeconds` old (the
 * wake-up for it was lost) is marked told but not pushed: the chat list
 * shows it, and a push that late is noise. A newer message is pushed as usual.
 */
export async function claimChatPushes({ delaySeconds, maxAgeSeconds, limit }: { delaySeconds: number; maxAgeSeconds: number; limit: number }): Promise<ChatToPush[]> {
    const m = schema.chatMembers;
    const x = schema.chatMessages;
    const claimed = await db.execute<{ chat_id: string; user_id: string; fresh: boolean }>(sql`
        with due as (
            select ${m.chatId} as chat_id, ${m.userId} as user_id, (
                select max(x.created_at) from ${x} x
                where x.chat_id = ${m.chatId} and x.created_by <> ${m.userId} and x.deleted_at is null
                    and x.created_at > greatest(${m.lastReadAt}, ${m.clearedAt}, ${m.lastPushedAt}, '-infinity'::timestamptz)
            ) as newest from ${m}
            join ${schema.userSettings} s on s.user_id = ${m.userId} and s.push_messages
            where (
                select min(x.created_at) from ${x} x
                where x.chat_id = ${m.chatId} and x.created_by <> ${m.userId} and x.deleted_at is null
                    and x.created_at > greatest(${m.lastReadAt}, ${m.clearedAt}, ${m.lastPushedAt}, '-infinity'::timestamptz)
            ) <= now() - make_interval(secs => ${delaySeconds})
            limit ${limit}
            for update of ${m} skip locked
        )
        update ${m} set last_pushed_at = now() from due
        where ${m.chatId} = due.chat_id and ${m.userId} = due.user_id
        returning ${m.chatId} as chat_id, ${m.userId} as user_id, due.newest > now() - make_interval(secs => ${maxAgeSeconds}) as fresh`);

    const toPush: ChatToPush[] = [];
    for (const { chat_id: chatId, user_id: userId } of claimed.rows.filter((row) => row.fresh)) {
        const blocked = await findBlockedEitherWay(userId);
        const [latest] = await db.execute<{ content: string; username: string; created_by: string; unread: number }>(sql`
            select x.content, p.username, x.created_by, count(*) over ()::int as unread
            from ${x} x
            join ${schema.userProfiles} p on p.user_id = x.created_by
            where x.chat_id = ${chatId} and x.created_by <> ${userId} and x.deleted_at is null
                -- Unread: after they last read the chat (or cleared it).
                and x.created_at > (
                    select greatest(last_read_at, cleared_at, '-infinity'::timestamptz) from ${m}
                    where chat_id = ${chatId} and user_id = ${userId}
                )
                and not ${isUnavailable(sql`x.created_by`)}
                ${blocked.length > 0 ? sql`and x.created_by not in (${sql.join(blocked.map((id) => sql`${id}`), sql`, `)})` : sql``}
            order by x.created_at desc, x.id desc
            limit 1`).then((result) => result.rows);
        if (!latest) {
            continue;
        }
        toPush.push({
            userId,
            chatId,
            senderUsername: latest.username,
            unreadCount: latest.unread,
            latestMessage: latest.content,
            badge: await countUnreadVisible({ userId, excludedActorIds: blocked }),
        });
    }
    return toPush;
}
