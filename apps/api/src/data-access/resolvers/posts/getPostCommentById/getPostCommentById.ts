import { and, eq, isNull } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment } from "../../../mappers/posts";
import { selectPostComments } from "../../../selects/selectPostComments";

/** A comment, as `viewerId` sees it. Null if it doesn't exist or was deleted. */
export async function getPostCommentById({ id, viewerId }: { id: string; viewerId: string | null }): Promise<PostComment | null> {
    const [row] = await selectPostComments(db, viewerId)
        .where(and(eq(schema.postComments.id, id), isNull(schema.postComments.deletedAt)));
    return row ? toPostComment(row) : null;
}
