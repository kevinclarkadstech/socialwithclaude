import { and, eq, isNull } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";

/** A comment, or null if it doesn't exist or was deleted. */
export async function getPostCommentById({ id }: { id: string }): Promise<PostComment | null> {
    const [row] = await db
        .select()
        .from(schema.postComments)
        .where(and(eq(schema.postComments.id, id), isNull(schema.postComments.deletedAt)));
    return row ? toPostComment(row) : null;
}
