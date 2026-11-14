import { and, eq, sql } from "drizzle-orm";
import type { UserSaveType } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { saveTargetColumns } from "../../../constants";

/** Unsaves a post, comment or chat message for `userId`. False if it wasn't saved. */
export async function deleteUserSave({ userId, type, id }: {
    userId: string;
    type: UserSaveType;
    id: string;
}): Promise<boolean> {
    return db.transaction(async (tx) => {
        const deleted = await tx
            .delete(schema.userSaves)
            .where(and(eq(schema.userSaves.userId, userId), eq(saveTargetColumns[type], id)))
            .returning({ userId: schema.userSaves.userId });
        if (deleted.length === 0) {
            return false;
        }

        if (type === "post") {
            await tx
                .update(schema.posts)
                .set({ numSaves: sql`${schema.posts.numSaves} - 1` })
                .where(eq(schema.posts.id, id));
        }
        return true;
    });
}
