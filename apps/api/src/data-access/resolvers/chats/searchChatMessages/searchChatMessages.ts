import { and, desc, eq, ilike, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { ChatMessageSearchResult } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toPage } from "../../../utils/toPage/toPage";
import { findChatMessageViews } from "../../../internal/chats/findChatMessageViews/findChatMessageViews";

const messages = schema.chatMessages;
const members = schema.chatMembers;

/**
 * Messages whose content contains `query` (case-insensitive) in the chats
 * `viewerId` is a member of, newest first, each with who the chat is with.
 * Deleted messages, and those from before the viewer cleared the chat, are
 * left out. The cursor is the last message's id.
 */
export async function searchChatMessages({ viewerId, query, cursor, limit }: {
    viewerId: string;
    query: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<ChatMessageSearchResult>> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const found = await findChatMessageViews({
        viewerId,
        where: and(
            isNull(messages.deletedAt),
            ilike(messages.content, pattern),
            // Only the viewer's chats, after they last cleared them.
            sql`exists (select 1 from ${members} where ${members.chatId} = ${messages.chatId} and ${members.userId} = ${viewerId} and (${members.clearedAt} is null or ${messages.createdAt} > ${members.clearedAt}))`,
            cursor
                ? sql`(${messages.createdAt}, ${messages.id}) < (select created_at, id from chat_messages where id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(messages.createdAt), desc(messages.id)],
        limit: limit + 1,
    });
    const page = toPage(found, limit, (message) => message.id);

    // Who each chat is with: the member who isn't the viewer.
    const chatIds = [...new Set(page.items.map((message) => message.chatId))];
    const others = chatIds.length
        ? await db
            .select({ chatId: members.chatId, member: creatorFields })
            .from(members)
            .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, members.userId))
            .where(and(inArray(members.chatId, chatIds), ne(members.userId, viewerId)))
        : [];
    const otherMemberOf = new Map(others.map((row) => [row.chatId, toCreator(row.member)]));

    const items = page.items.flatMap((message): ChatMessageSearchResult[] => {
        const otherMember = otherMemberOf.get(message.chatId);
        // A chat whose other member has gone (account deleted) has no one to show.
        return otherMember ? [{ message, otherMember }] : [];
    });
    return { items, nextCursor: page.nextCursor };
}
