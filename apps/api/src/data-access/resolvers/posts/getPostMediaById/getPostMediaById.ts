import { eq } from "drizzle-orm";
import type { UploadedPostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUploadedPostMedia } from "../../../mappers/posts";

/** A photo uploaded for a post, whether or not it's on one yet. Null if there's none with that id. */
export async function getPostMediaById({ id }: { id: string }): Promise<UploadedPostMedia | null> {
    const [row] = await db.select().from(schema.postMedia).where(eq(schema.postMedia.id, id));
    return row ? toUploadedPostMedia(row) : null;
}
