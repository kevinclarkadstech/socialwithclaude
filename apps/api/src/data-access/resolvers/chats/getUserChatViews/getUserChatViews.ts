import { and, desc, isNotNull, isNull, or, gt, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { ChatView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findChatViews } from "../../../internal/chats/findChatViews/findChatViews";
import { toPage } from "../../../utils/toPage/toPage";

/**
 * `userId`'s inbox: their chats with a message, the most recent first. A
 * chat they cleared stays out until a new message comes. The cursor is the
 * last chat's id.
 */
export async function getUserChatViews({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<ChatView>> {
    const chats = schema.chats;
    const me = schema.chatMembers;
    const views = await findChatViews({
        viewerId: userId,
        where: and(
            isNotNull(chats.lastMessageAt),
            or(isNull(me.clearedAt), gt(chats.lastMessageAt, me.clearedAt)),
            cursor
                ? sql`(${chats.lastMessageAt}, ${chats.id}) < (select last_message_at, id from chats where id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(chats.lastMessageAt), desc(chats.id)],
        limit: limit + 1,
    });
    return toPage(views, limit, (chat) => chat.id);
}
