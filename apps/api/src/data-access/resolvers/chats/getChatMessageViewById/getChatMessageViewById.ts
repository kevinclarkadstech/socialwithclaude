import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessageView } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { findChatMessageViews } from "../../../internal/chats/findChatMessageViews/findChatMessageViews";

/** A message, as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getChatMessageViewById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<ChatMessageView | null> {
    const [message] = await findChatMessageViews({ executor, viewerId, where: and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)) });
    return message ?? null;
}
