import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ChatMessageView } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";

/**
 * Reads chat messages as `viewerId` sees them: each with its creator (the
 * sender) and whether the viewer saved it.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function findChatMessageViews({ executor = db, viewerId, where, orderBy = [], limit }: {
    executor?: Executor;
    viewerId: string | null;
    where?: SQL;
    orderBy?: (SQL | AnyPgColumn)[];
    limit?: number;
}): Promise<ChatMessageView[]> {
    let query = selectChatMessages(executor, viewerId);
    if (where) {
        query = query.where(where);
    }
    if (orderBy.length > 0) {
        query = query.orderBy(...orderBy);
    }
    if (limit !== undefined) {
        query = query.limit(limit);
    }
    const rows = await query;
    return rows.map(toChatMessage);
}

function selectChatMessages(executor: Executor, viewerId: string | null) {
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

type Row = Awaited<ReturnType<typeof selectChatMessages>>[number];

/** A message from selectChatMessages. */
function toChatMessage({ message, creator, savedAt }: Row): ChatMessageView {
    return {
        id: message.id,
        chatId: message.chatId,
        content: message.content,
        creator: toCreator(creator),
        viewer: { hasSaved: savedAt !== null },
        createdBy: message.createdBy,
        updatedBy: message.updatedBy,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
    };
}
