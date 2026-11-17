import { eq } from "drizzle-orm";
import type { PostCommentPhoto } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostCommentPhoto } from "../../../mappers/posts/toPostCommentPhoto/toPostCommentPhoto";

/** A comment's photo, or null if it has none. */
export async function getPostCommentPhoto({ postCommentId }: { postCommentId: string }): Promise<PostCommentPhoto | null> {
    const [row] = await db.select().from(schema.postCommentPhotos).where(eq(schema.postCommentPhotos.postCommentId, postCommentId));
    return row ? toPostCommentPhoto(row) : null;
}
