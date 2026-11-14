import { eq } from "drizzle-orm";
import type { ChatView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findChatViews } from "../../../internal/chats/findChatViews/findChatViews";

/** A chat as its member `viewerId` sees it; null if it doesn't exist or they aren't in it. */
export async function getChatViewById({ chatId, viewerId }: { chatId: string; viewerId: string }): Promise<ChatView | null> {
    const [view] = await findChatViews({ viewerId, where: eq(schema.chats.id, chatId), limit: 1 });
    return view ?? null;
}
