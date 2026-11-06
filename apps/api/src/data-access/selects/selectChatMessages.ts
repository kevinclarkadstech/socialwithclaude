import { and, eq, sql } from "drizzle-orm";
import { schema } from "../db";
import { creatorFields } from "./creatorFields";
import type { Executor } from "./executor";

/**
 * Chat messages with their creator (the sender) and whether `viewerId`
 * saved them. Add where/orderBy/limit, then map rows with toChatMessage.
 */
export function selectChatMessages(executor: Executor, viewerId: string | null) {
    return executor
        .select({
            message: schema.chatMessages,
            creator: creatorFields,
            savedAt: schema.userSaves.createdAt,
        })
        .from(schema.chatMessages)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.chatMessages.createdBy))
        .leftJoin(
            schema.userSaves,
            viewerId
                ? and(eq(schema.userSaves.chatMessageId, schema.chatMessages.id), eq(schema.userSaves.userId, viewerId))
                : sql`false`,
        )
        .$dynamic();
}

export type SelectedChatMessageRow = Awaited<ReturnType<typeof selectChatMessages>>[number];
