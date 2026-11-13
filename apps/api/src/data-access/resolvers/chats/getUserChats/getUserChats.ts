import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { Chat } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChat } from "../../../mappers/chats";
import { toPage } from "../../../paging";

/** The chats `userId` is a member of, newest first. */
export async function getUserChats({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Chat>> {
    const rows = await db
        .select({ chat: schema.chats })
        .from(schema.chatMembers)
        .innerJoin(schema.chats, eq(schema.chats.id, schema.chatMembers.chatId))
        .where(and(
            eq(schema.chatMembers.userId, userId),
            cursor
                ? sql`(${schema.chats.createdAt}, ${schema.chats.id}) < (select created_at, id from chats where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.chats.createdAt), desc(schema.chats.id))
        .limit(limit + 1);
    return toPage(rows.map((row) => toChat(row.chat)), limit, (chat) => chat.id);
}
