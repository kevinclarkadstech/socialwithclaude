import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { ChatMessage } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../paging";
import { readChatMessages } from "../readChatMessages/readChatMessages";

/** A chat's messages, newest first, as `viewerId` sees them; only those sent after `after` if given. */
export async function getChatMessages({ chatId, viewerId, after, cursor, limit }: {
    chatId: string;
    viewerId: string | null;
    after?: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<ChatMessage>> {
    const t = schema.chatMessages;
    const messages = await readChatMessages({
        viewerId,
        where: and(
            eq(t.chatId, chatId),
            isNull(t.deletedAt),
            after ? gt(t.createdAt, new Date(after)) : undefined,
            cursor
                ? sql`(${t.createdAt}, ${t.id}) < (select created_at, id from chat_messages where id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(t.createdAt), desc(t.id)],
        limit: limit + 1,
    });
    return toPage(messages, limit, (message) => message.id);
}
