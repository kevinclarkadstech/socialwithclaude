import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Soft deletes a message for everyone, as `userId`. False if it doesn't exist or was already deleted. */
export async function deleteChatMessage({ id, userId }: { id: string; userId: string }): Promise<boolean> {
    const rows = await db
        .update(schema.chatMessages)
        .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
        .where(and(
            eq(schema.chatMessages.id, id),
            isNull(schema.chatMessages.deletedAt),
        ))
        .returning({ id: schema.chatMessages.id });
    return rows.length > 0;
}
