import type { Media } from "@myapp/shared/common/images";
import { db, schema } from "../../../db";

/** Records images uploaded by `userId`. Returns the ids it recorded: one already used is skipped. */
export async function createMedia({ userId, media }: { userId: string; media: Media[] }): Promise<string[]> {
    if (media.length === 0) {
        return [];
    }
    const rows = await db
        .insert(schema.media)
        .values(media.map((item) => ({ ...item, createdBy: userId, updatedBy: userId })))
        .onConflictDoNothing({ target: schema.media.id })
        .returning({ id: schema.media.id });
    return rows.map((row) => row.id);
}
