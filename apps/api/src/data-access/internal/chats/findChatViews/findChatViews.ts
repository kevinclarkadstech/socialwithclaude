import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ChatView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toChat } from "../../../mappers/chats/toChat/toChat";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";

type LastMessage = { content: string; createdBy: string; createdAt: string };

/**
 * Reads chats as their member `viewerId` sees them: who they're talking to,
 * the newest message they can see (not deleted, not from before they cleared
 * the chat), and whether a message from the other person came after they
 * last read it. Only chats `viewerId` is a member of. Data only: who can see
 * a chat is decided in shared (canViewChat).
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function findChatViews({ viewerId, where, orderBy = [], limit }: {
    viewerId: string;
    where?: SQL;
    orderBy?: (SQL | AnyPgColumn)[];
    limit?: number;
}): Promise<ChatView[]> {
    const chats = schema.chats;
    const me = schema.chatMembers;
    // 1:1 chats: whichever of the two isn't the viewer.
    const otherUserId = sql`case when ${chats.createdBy} = ${viewerId} then ${chats.receiverId} else ${chats.createdBy} end`;
    // Messages the viewer can see: not deleted, and not from before they cleared the chat.
    const visibleMessage = sql`m.chat_id = ${chats.id} and m.deleted_at is null and (${me.clearedAt} is null or m.created_at > ${me.clearedAt})`;

    let query = db
        .select({
            chat: chats,
            otherMember: creatorFields,
            lastMessage: sql<LastMessage | null>`(
                select json_build_object(
                    'content', m.content,
                    'createdBy', m.created_by,
                    'createdAt', to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
                from ${schema.chatMessages} m
                where ${visibleMessage}
                order by m.created_at desc, m.id desc
                limit 1
            )`,
            hasUnread: sql<boolean>`exists (
                select 1 from ${schema.chatMessages} m
                where ${visibleMessage}
                    and m.created_by <> ${viewerId}
                    and (${me.lastReadAt} is null or m.created_at > ${me.lastReadAt})
            )`,
        })
        .from(me)
        .innerJoin(chats, eq(chats.id, me.chatId))
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, otherUserId))
        .where(and(eq(me.userId, viewerId), where))
        .$dynamic();
    if (orderBy.length > 0) {
        query = query.orderBy(...orderBy);
    }
    if (limit !== undefined) {
        query = query.limit(limit);
    }
    const rows = await query;
    return rows.map(({ chat, otherMember, lastMessage, hasUnread }) => ({
        ...toChat(chat),
        otherMember: toCreator(otherMember),
        lastMessage,
        viewer: { hasUnread },
    }));
}
