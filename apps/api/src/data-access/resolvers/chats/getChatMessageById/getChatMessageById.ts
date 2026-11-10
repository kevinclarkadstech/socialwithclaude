import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { readChatMessages } from "../readChatMessages/readChatMessages";

/** A message, as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getChatMessageById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<ChatMessage | null> {
    const [message] = await readChatMessages({ executor, viewerId, where: and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)) });
    return message ?? null;
}
