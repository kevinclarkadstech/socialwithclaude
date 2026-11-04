import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Soft deletes (for everyone) a message `userId` sent. False if they sent no such message. */
export async function deleteChatMessage({ id, userId }: { id: string; userId: string }): Promise<boolean> {
    const rows = await db
        .update(schema.chatMessages)
        .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
        .where(and(
            eq(schema.chatMessages.id, id),
            eq(schema.chatMessages.createdBy, userId),
            isNull(schema.chatMessages.deletedAt),
        ))
        .returning({ id: schema.chatMessages.id });
    return rows.length > 0;
}
