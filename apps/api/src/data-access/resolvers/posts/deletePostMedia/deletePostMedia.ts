import { eq } from "drizzle-orm";
import { schema, type Transaction } from "../../../db";

/** Deletes a post's photo rows (when the post is deleted; the mutation deletes their files). */
export async function deletePostMedia(tx: Transaction, { postId }: { postId: string }) {
    await tx.delete(schema.postMedia).where(eq(schema.postMedia.postId, postId));
}
