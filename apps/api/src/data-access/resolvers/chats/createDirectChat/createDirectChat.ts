import { sql } from "drizzle-orm";
import type { Chat } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChat } from "../../../mappers/chats";

/**
 * Starts a 1:1 chat between `userId` and `receiverId` with the client's
 * `id`, adding both as members. If the two already have a chat (whoever
 * started it), returns that one instead. Null if `id` is already used by
 * another chat.
 */
export async function createDirectChat({ id, userId, receiverId }: {
    id: string;
    userId: string;
    receiverId: string;
}): Promise<Chat | null> {
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.chats)
            .values({ id, receiverId, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing()
            .returning();
        if (created) {
            await tx.insert(schema.chatMembers).values([
                { chatId: id, userId },
                { chatId: id, userId: receiverId },
            ]);
            return toChat(created);
        }

        const [existing] = await tx
            .select()
            .from(schema.chats)
            .where(sql`least(${schema.chats.createdBy}, ${schema.chats.receiverId}) = least(${userId}, ${receiverId})
                and greatest(${schema.chats.createdBy}, ${schema.chats.receiverId}) = greatest(${userId}, ${receiverId})`);
        return existing ? toChat(existing) : null;
    });
}
