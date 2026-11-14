import { asc, eq } from "drizzle-orm";
import type { PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostMedia } from "../../../mappers/posts/toPostMedia/toPostMedia";

/** A post's photos, in the order they were added. */
export async function getPostMediaByPostId({ postId }: { postId: string }): Promise<PostMedia[]> {
    const rows = await db.select().from(schema.postMedia).where(eq(schema.postMedia.postId, postId)).orderBy(asc(schema.postMedia.id));
    return rows.map(toPostMedia);
}
