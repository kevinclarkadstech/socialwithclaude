import type { UploadedPostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUploadedPostMedia } from "../../../mappers/posts";

/** Records a photo uploaded by `userId`, on no post yet. Null if the id is already used. */
export async function createPostMedia({ id, userId, path, width, height, placeholder }: {
    id: string;
    userId: string;
    path: string;
    width: number;
    height: number;
    placeholder: string | null;
}): Promise<UploadedPostMedia | null> {
    const [row] = await db
        .insert(schema.postMedia)
        .values({ id, path, width, height, placeholder, createdBy: userId, updatedBy: userId })
        .onConflictDoNothing({ target: schema.postMedia.id })
        .returning();
    return row ? toUploadedPostMedia(row) : null;
}
