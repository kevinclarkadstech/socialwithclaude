import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessage } from "../../../mappers/chats";
import { toPage } from "../../../paging";

/** A chat's messages, newest first; only those sent after `after` if given. */
export async function getChatMessages({ chatId, after, cursor, limit }: {
    chatId: string;
    after?: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<ChatMessage>> {
    const t = schema.chatMessages;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            eq(t.chatId, chatId),
            isNull(t.deletedAt),
            after ? gt(t.createdAt, new Date(after)) : undefined,
            cursor
                ? sql`(${t.createdAt}, ${t.id}) < (select created_at, id from chat_messages where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(limit + 1);
    return toPage(rows.map(toChatMessage), limit, (message) => message.id);
}
