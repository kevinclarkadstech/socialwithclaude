import { eq, sql } from "drizzle-orm";
import type { UserSaveType } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { saveTargetValues } from "../../../internal/users/saveTargetValues/saveTargetValues";

/** Saves a post, comment or chat message for `userId`. False if it was already saved. */
export async function createUserSave({ userId, type, id }: {
    userId: string;
    type: UserSaveType;
    id: string;
}): Promise<boolean> {
    return db.transaction(async (tx) => {
        const created = await tx
            .insert(schema.userSaves)
            .values({ userId, ...saveTargetValues(type, id) })
            .onConflictDoNothing()
            .returning({ userId: schema.userSaves.userId });
        if (created.length === 0) {
            return false;
        }

        if (type === "post") {
            await tx
                .update(schema.posts)
                .set({ numSaves: sql`${schema.posts.numSaves} + 1` })
                .where(eq(schema.posts.id, id));
        }
        return true;
    });
}
